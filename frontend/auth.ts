import { customFetch } from "@auth/core";
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { createInternalKeycloakFetch } from "@/lib/auth/internalKeycloakFetch";
import { putStoredAccount, valkeyAdapter } from "@/lib/auth/valkeyAdapter";

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
  callbacks: {
    // The default session callback strips the user down to name/email/image
    // (@auth/core/lib/init.js). The id is kept because server code needs it to
    // look up this session's stored tokens; it is this app's own session key,
    // never a cross-system user id — per-user data keys on the token's `sub`
    // (ADR-0028).
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id },
    }),
  },
  events: {
    // Do not remove: without this the stored tokens are frozen at the user's
    // very first sign-in, forever. Auth.js calls the adapter's linkAccount
    // only when an account is first linked — on every later sign-in the
    // returning-user path in @auth/core's handle-login.js creates a session
    // and returns without touching the account, and the Adapter interface has
    // no updateAccount for it to call. Nothing fails loudly: sign-in still
    // works, so the staleness only surfaces later as an id_token_hint that
    // names a long-dead Keycloak session (which makes Keycloak fall back to
    // its "Do you want to log out?" page) and, once the resource server
    // lands, as an expired access_token on backend calls.
    signIn: async ({ user, account }) => {
      // "credentials" is the one provider type the Adapter's account model
      // does not cover; this app has no such provider, so it cannot occur.
      if (!account || !user.id || account.type === "credentials") {
        return;
      }
      await putStoredAccount({ ...account, type: account.type, userId: user.id });
    },
  },
});
