import { endLocalSession } from "./endLocalSession";
import { currentSessionToken } from "./sessionCookie";

export const endCurrentSession = async (): Promise<void> => {
  const sessionToken = await currentSessionToken();
  if (sessionToken) {
    await endLocalSession(sessionToken);
  }
};

/**
 * Wraps Auth.js's `signIn` so every sign-in starts with no local session.
 * Left in place, Auth.js links the account Keycloak returns to the signed-in
 * user, so a second person signing in would be filed under the first one's
 * identity and every backend call would carry the first one's token. A
 * failure to end the session stops the sign-in rather than letting it
 * continue.
 *
 * Do not export `signIn` from auth.ts without this: nothing fails, and the
 * second person quietly inherits the first person's tokens.
 */
export const endingLocalSession =
  <Args extends unknown[], Result>(signIn: (...args: Args) => Promise<Result>) =>
  async (...args: Args): Promise<Result> => {
    await endCurrentSession();
    return signIn(...args);
  };
