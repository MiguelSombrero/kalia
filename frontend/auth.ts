import { customFetch } from "@auth/core";
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { createInternalKeycloakFetch } from "@/lib/auth/internalKeycloakFetch";
import { sidFromIdToken } from "@/lib/auth/sessionId";
import { createdSession } from "@/lib/auth/signInContext";
import { putSessionAccount, putSessionSid, valkeyAdapter } from "@/lib/auth/valkeyAdapter";

// `issuer` must stay Keycloak's public `iss` (KC_HOSTNAME): oauth4webapi's
// validateAuthResponse checks the callback against this exact string, and
// the internal Docker hostname throws "unexpected iss" if used instead —
// confirmed live. Requests are redirected to the internal origin transparently
// (lib/auth/internalKeycloakFetch.ts); the validated `iss` string is untouched.
const fetchViaInternalKeycloak = createInternalKeycloakFetch(
  process.env.AUTH_KEYCLOAK_ISSUER!,
  process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN!,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: valkeyAdapter,
  // Mirrors the realm's ssoSessionMaxLifespan. Do not raise maxAge above
  // updateAge expecting a sliding session: Auth.js only re-dates once
  // `expires - maxAge + updateAge` has passed (@auth/core's
  // lib/actions/session.js) — equal values mean a fixed 10h expiry, the intent.
  session: { strategy: "database", maxAge: 10 * 60 * 60, updateAge: 10 * 60 * 60 },
  // Required when self-hosting off Vercel: without it, Auth.js rejects
  // every request's Host header as untrusted (errors.authjs.dev#untrustedhost).
  trustHost: true,
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      // Safe only because Keycloak is the sole provider: see ADR-0033.
      allowDangerousEmailAccountLinking: true,
      [customFetch]: fetchViaInternalKeycloak,
    }),
  ],
  events: {
    // Do not remove: the only point Auth.js hands the provider's token set
    // to the application, since the Adapter interface has no updateAccount.
    // Nothing fails loudly without it — sign-in still succeeds but reaches
    // no protected endpoint later.
    signIn: async ({ user, account }) => {
      // "credentials" is the one provider type the Adapter's account model
      // does not cover; this app has no such provider, so it cannot occur.
      if (!account || !user.id || account.type === "credentials") {
        return;
      }
      const session = createdSession();
      // No session means Auth.js reused an existing one; its tokens stay
      // current via lazy renewal instead (lib/api/accessToken.ts, ADR-0029).
      if (!session) {
        return;
      }
      await putSessionAccount(
        session.sessionToken,
        { ...account, type: account.type, userId: user.id },
        session.expires,
      );
      // Indexes by Keycloak sid so Back-Channel Logout can find the session (ADR-0031).
      const sid = account.id_token ? sidFromIdToken(account.id_token) : undefined;
      if (sid) {
        await putSessionSid(session.sessionToken, sid, session.expires);
      }
    },
  },
});
