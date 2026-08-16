import { cookies } from "next/headers";

// Unprefixed on http, `__Secure-` prefixed on https (@auth/core's
// lib/utils/cookie.js `defaultCookies`). Chunked `.0`/`.1` variants apply
// only to the JWT strategy, not this app's database sessions (ADR-0025).
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

// `auth()` does not expose the session token; server code reads it here (ADR-0030).
export const currentSessionToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(
    (value) => value !== undefined,
  );
};
