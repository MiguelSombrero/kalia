import { valkeyAdapter } from "./valkeyAdapter";

/**
 * Ends one Kalia session by deleting its server-side records, used when
 * Keycloak has already ended the session behind it (lib/api/accessToken.ts).
 *
 * Deliberately does not clear the session cookie: this runs during Server
 * Component rendering, where Next.js forbids setting cookies
 * (`next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`). The
 * record is the authority under the database strategy, so the orphaned cookie
 * resolves to nothing and the next `auth()` returns null — the current render
 * still shows the user as signed in, the next one does not.
 */
export const endLocalSession = async (sessionToken: string): Promise<void> => {
  await valkeyAdapter.deleteSession?.(sessionToken);
};
