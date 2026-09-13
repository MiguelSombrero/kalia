import { cookies } from "next/headers";

// Unprefixed on http, `__Secure-` prefixed on https (@auth/core's
// lib/utils/cookie.js `defaultCookies`). Chunked `.0`/`.1` variants apply
// only to the JWT strategy, not this app's database sessions (ADR-0025).
// Do not swap this order back: `__Secure-` must come first. It can only be
// set over HTTPS, so putting it first is what stops an attacker who can only
// write a cookie for this domain (not read the victim's) from winning here.
const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

// `auth()` does not expose the session token; server code reads it here (ADR-0030).
export const currentSessionToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(
    (value) => value !== undefined,
  );
};
