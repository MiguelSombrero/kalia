import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { getStoredAccountByUserId } from "@/lib/auth/valkeyAdapter";

/**
 * Auth.js does not support federated (RP-initiated) logout out of the box
 * (documented in next-auth/adapters.d.ts's "Known issues" — the IdP session
 * survives a plain signOut()). This clears the local session first, then
 * sends the browser to Keycloak's own end-session endpoint so its SSO
 * cookie is cleared too — otherwise a later "sign in" click would silently
 * re-authenticate without prompting for credentials.
 */
// POST, not GET: this is a state-changing action (deletes the session) and
// must not be triggerable by a plain link, prefetch, or embedded resource.
export const POST = async () => {
  const session = await auth();
  const idToken = session?.user?.id
    ? (await getStoredAccountByUserId(session.user.id))?.id_token
    : undefined;

  await signOut({ redirect: false });

  // AUTH_URL, not request.url: inside the container this request's URL
  // reflects the 0.0.0.0 bind address, not the browser-facing host — the
  // same problem AUTH_URL already exists to solve for Auth.js itself
  // (confirmed live: an unfixed post_logout_redirect_uri pointed Keycloak
  // at an unreachable http://0.0.0.0:3000/).
  const homeUrl = new URL("/", process.env.AUTH_URL);
  // 303, not the default 307: the browser must GET the redirect target,
  // not replay this POST against Keycloak (or "/").
  if (!idToken || !process.env.AUTH_KEYCLOAK_ISSUER) {
    return NextResponse.redirect(homeUrl, 303);
  }

  // AUTH_KEYCLOAK_ISSUER is Keycloak's public identity (see auth.ts) — safe
  // to redirect the browser there directly. Stable Keycloak convention
  // (server_admin docs: "OIDC clients" / "Logout"), not derived from the
  // discovery document to avoid an extra round trip on every sign-out.
  const endSessionUrl = new URL(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  endSessionUrl.searchParams.set("id_token_hint", idToken);
  endSessionUrl.searchParams.set("post_logout_redirect_uri", homeUrl.toString());

  return NextResponse.redirect(endSessionUrl, 303);
};
