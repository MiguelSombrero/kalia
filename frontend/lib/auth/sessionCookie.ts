import { cookies } from "next/headers";

/**
 * Auth.js's session cookie, unprefixed on http and `__Secure-` prefixed on
 * https (@auth/core's lib/utils/cookie.js `defaultCookies`). Both are listed
 * because the prefix follows the deployment's scheme, not the build. Chunked
 * variants (`.0`, `.1`) are not: chunking applies to the JWT strategy, and
 * this app stores an opaque session token (ADR-0025).
 */
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * The caller's Auth.js session token — the key every stored record belonging
 * to *this* sign-in hangs off (ADR-0030). `auth()` does not expose it, so
 * server code that needs the session's own Keycloak tokens reads it here.
 */
export const currentSessionToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(
    (value) => value !== undefined,
  );
};
