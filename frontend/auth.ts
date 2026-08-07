import { customFetch } from "@auth/core";
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { createInternalKeycloakFetch } from "@/lib/auth/internalKeycloakFetch";
import { sidFromIdToken } from "@/lib/auth/sessionId";
import { createdSession } from "@/lib/auth/signInContext";
import { putSessionAccount, putSessionSid, valkeyAdapter } from "@/lib/auth/valkeyAdapter";

/**
 * `issuer` must be Keycloak's one canonical, public identity — the value
 * baked into every token/discovery-document/callback `iss` it issues,
 * fixed via KC_HOSTNAME in docker-compose.yml so it doesn't vary by which
 * published address a given request happened to arrive on. Auth.js
 * validates the callback's `iss` parameter against this exact string
 * (oauth4webapi's validateAuthResponse), so it cannot be the internal
 * Docker Compose hostname even though that's the only one the frontend
 * container can actually dial — confirmed live: using the internal
 * hostname here throws "unexpected iss (issuer) response parameter value".
 *
 * The container still can't reach Keycloak via the public URL (it's
 * published loopback-only on the host, unreachable from inside another
 * container), so every oauth4webapi-initiated request (discovery, token
 * exchange, userinfo, jwks) is transparently redirected to the internal
 * origin — the URL string identity Auth.js validates against is
 * untouched, only where the bytes actually go (lib/auth/internalKeycloakFetch.ts).
 */
const fetchViaInternalKeycloak = createInternalKeycloakFetch(
  process.env.AUTH_KEYCLOAK_ISSUER!,
  process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN!,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: valkeyAdapter,
  // Both values mirror the realm's ssoSessionMaxLifespan
  // (keycloak/realm-export.json), so a Kalia session cannot outlive the
  // Keycloak SSO session behind it; Auth.js's own defaults are 30 days and
  // 24 hours (@auth/core's lib/init.js).
  //
  // Do not raise maxAge above updateAge expecting a sliding session. Auth.js
  // re-dates a session only once `expires - maxAge + updateAge` has passed
  // (@auth/core's lib/actions/session.js), so equal values mean it is never
  // re-dated and the session expires a fixed 10 hours after sign-in — which is
  // the intent, matching Keycloak's own absolute maximum. Idleness is not
  // measured here at all; a session idle past the realm's 30 minutes dies at
  // its next request, when the refresh fails (lib/api/accessToken.ts, ADR-0029).
  session: { strategy: "database", maxAge: 10 * 60 * 60, updateAge: 10 * 60 * 60 },
  // Required when self-hosting off Vercel: without it, Auth.js rejects
  // every request's Host header as untrusted (errors.authjs.dev#untrustedhost).
  trustHost: true,
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      [customFetch]: fetchViaInternalKeycloak,
    }),
  ],
  events: {
    // Do not remove: this is the only point at which Auth.js hands the
    // provider's token set to the application. The adapter's linkAccount runs
    // once per account ever and before any session exists, the returning-user
    // path in @auth/core's handle-login.js never touches the account again,
    // and the Adapter interface has no updateAccount. Nothing fails loudly if
    // this goes — sign-in still succeeds, and only later does the session turn
    // out to reach no protected endpoint and to sign out of Keycloak without a
    // usable id_token_hint.
    signIn: async ({ user, account }) => {
      // "credentials" is the one provider type the Adapter's account model
      // does not cover; this app has no such provider, so it cannot occur.
      if (!account || !user.id || account.type === "credentials") {
        return;
      }
      const session = createdSession();
      // Auth.js reused an existing session instead of creating one: an
      // already-signed-in user signing in again. That session keeps the tokens
      // it already has, which the lazy renewal in lib/api/accessToken.ts keeps
      // current (ADR-0029) — overwriting them here is neither needed nor
      // possible, since nothing in this event identifies the session.
      if (!session) {
        return;
      }
      await putSessionAccount(
        session.sessionToken,
        { ...account, type: account.type, userId: user.id },
        session.expires,
      );
      // Indexes the session by its Keycloak SSO session id, so a
      // Back-Channel Logout token — which names a sid, not this session's
      // token — can find it (ADR-0031). Absent only if Keycloak were
      // configured without backchannel.logout.session.required, which the
      // realm export pins on.
      const sid = account.id_token ? sidFromIdToken(account.id_token) : undefined;
      if (sid) {
        await putSessionSid(session.sessionToken, sid, session.expires);
      }
    },
  },
});
