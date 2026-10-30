import { AsyncLocalStorage } from "node:async_hooks";
import type { AdapterSession } from "next-auth/adapters";

type SignInContext = { created?: AdapterSession };

const storage = new AsyncLocalStorage<SignInContext>();

/**
 * Carries the session Auth.js just created across to `events.signIn`, which is
 * the only place Auth.js hands over the provider's token set but is given no
 * session of its own (ADR-0030).
 *
 * Do not unwrap the handlers in app/api/auth/[...nextauth]/route.ts. Without
 * this scope nothing throws — `events.signIn` simply finds no session to file
 * the tokens under, and every sign-in silently produces a session that can
 * reach no protected endpoint and cannot sign out of Keycloak.
 */
export const withSignInContext = <T>(run: () => T): T => storage.run({}, run);

/**
 * Called by the adapter's `createSession`. Auth.js awaits it before firing
 * `events.signIn` (@auth/core's lib/actions/callback/index.js awaits
 * `handleLoginOrRegister`, which creates the session, first), so the value is
 * always in place by the time the event reads it.
 */
export const rememberCreatedSession = (session: AdapterSession): void => {
  const context = storage.getStore();
  if (context) {
    context.created = session;
  }
};

/**
 * The session created during this request, or `undefined` when Auth.js reused
 * an existing one — the already-signed-in user signing in again, where
 * `handleLoginOrRegister` returns the cookie's session untouched.
 */
export const createdSession = (): AdapterSession | undefined => storage.getStore()?.created;
