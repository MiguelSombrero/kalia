import { cookies } from "next/headers";
import { valkeyAdapter } from "./valkeyAdapter";

/**
 * Auth.js's session cookie, unprefixed on http and `__Secure-` prefixed on
 * https (@auth/core's lib/utils/cookie.js `defaultCookies`). Both are listed
 * because the prefix follows the deployment's scheme, not the build. Chunked
 * variants (`.0`, `.1`) are not: chunking applies to the JWT strategy, and
 * this app stores an opaque session token (ADR-0025).
 */
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Ends the caller's Kalia session by deleting its server-side record, used
 * when Keycloak has already ended the session behind it (lib/api/accessToken.ts).
 *
 * Deliberately does not clear the session cookie: this runs during Server
 * Component rendering, where Next.js forbids setting cookies
 * (`next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`). The
 * record is the authority under the database strategy, so the orphaned cookie
 * resolves to nothing and the next `auth()` returns null — the current render
 * still shows the user as signed in, the next one does not.
 */
export const endLocalSession = async (): Promise<void> => {
  const cookieStore = await cookies();
  const sessionToken = SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(
    (value) => value !== undefined,
  );
  if (!sessionToken) {
    return;
  }
  await valkeyAdapter.deleteSession?.(sessionToken);
};
