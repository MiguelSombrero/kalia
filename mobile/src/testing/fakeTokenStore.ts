import type { AuthState, SignInResult, TokenStore } from "@/lib/auth/tokenStore";

export const fakeTokenStore = (initial: AuthState) => {
  let state = initial;
  const listeners = new Set<() => void>();
  const store = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getAccessToken: jest.fn(async (): Promise<string | undefined> => (state.status === "signedIn" ? "access-token" : undefined)),
    refreshAccessToken: jest.fn(async (_rejected?: string): Promise<string | undefined> => undefined),
    signIn: jest.fn(async (_locale: string): Promise<SignInResult> => "signedIn"),
    signOut: jest.fn(async () => undefined),
  } satisfies TokenStore;
  const set = (next: AuthState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return { ...store, set };
};
