"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount } from "@/lib/auth/valkeyAdapter";
import { keycloakEndSessionUrl } from "./endSessionUrl";

export const startSignIn = async () => {
  await signIn("keycloak");
};

/**
 * Signs out of Kalia and, through Keycloak's `end_session_endpoint`, of the
 * Keycloak SSO session behind it — this browser's, and only this browser's.
 * The `id_token_hint` names the session being ended, so it has to be the one
 * belonging to *this* Auth.js session rather than the user's latest sign-in
 * anywhere (ADR-0030).
 *
 * Do not turn this back into a plain form POST to a route handler. Auth.js has
 * no federated (RP-initiated) logout of its own — its `signOut()` clears only
 * this app's session, leaving Keycloak's SSO cookie alive so the next sign-in
 * silently re-authenticates with no credential prompt — so ending the session
 * *also* requires navigating the browser to Keycloak. A real form navigating
 * cross-origin is blocked by `form-action 'self'` in the CSP
 * (ADR-0016/ADR-0025); a Server Action's redirect is performed by the client
 * router instead, which that directive does not govern. Measured in a browser,
 * where the form-POST version failed and this one does not — curl does not
 * enforce CSP and will not reproduce it.
 */
export const federatedSignOut = async () => {
  const sessionToken = await currentSessionToken();
  const idToken = sessionToken ? (await getSessionAccount(sessionToken))?.id_token : undefined;

  await signOut({ redirect: false });

  // AUTH_URL, not the request: inside the container the request's own URL
  // reflects the 0.0.0.0 bind address rather than the browser-facing host.
  const home = new URL("/", process.env.AUTH_URL).toString();
  const endSession = keycloakEndSessionUrl({
    issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    idToken,
    postLogoutRedirectUri: home,
  });

  // Outside any try/catch: redirect() signals by throwing (Next.js docs,
  // 01-app/03-api-reference/04-functions/redirect.md).
  redirect(endSession ?? home);
};
