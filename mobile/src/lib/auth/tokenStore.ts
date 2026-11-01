import { apiError } from "@kalia/api";

export type StoredTokens = { accessToken: string; refreshToken: string; expiresAt: number };

export type TokenStorage = {
  load: () => Promise<StoredTokens | null>;
  save: (tokens: StoredTokens) => Promise<void>;
  clear: () => Promise<void>;
};

type Grant = { accessToken: string; refreshToken?: string; expiresInSeconds: number };

export type OAuthClient = {
  authorize: (locale: string) => Promise<{ kind: "granted"; grant: Grant } | { kind: "cancelled" }>;
  refresh: (refreshToken: string) => Promise<{ kind: "granted"; grant: Grant } | { kind: "rejected" }>;
  revoke: (refreshToken: string) => Promise<void>;
};

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut"; expired: boolean }
  | { status: "signedIn" };

export type SignInResult = "signedIn" | "cancelled" | "failed";

export type TokenStore = {
  getState: () => AuthState;
  subscribe: (listener: () => void) => () => void;
  getAccessToken: () => Promise<string | undefined>;
  /**
   * The API answered 401 to `rejected`: renews it whatever its local expiry
   * says. Calls rejected together share one refresh, and one rejected after
   * another has renewed the token gets the renewed one. A call sent without a
   * token (`undefined`) is `getAccessToken` again. Fails like it when the
   * refresh fails transiently.
   */
  refreshAccessToken: (rejected: string | undefined) => Promise<string | undefined>;
  signIn: (locale: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const EXPIRY_MARGIN_MS = 30_000;

export const createTokenStore = ({
  storage,
  oauth,
  now,
}: {
  storage: TokenStorage;
  oauth: OAuthClient;
  now: () => number;
}): TokenStore => {
  let state: AuthState = { status: "loading" };
  let tokens: StoredTokens | null = null;
  let session = 0;
  let refreshing: { generation: number; promise: Promise<string | undefined> } | undefined;
  const listeners = new Set<() => void>();

  const setState = (next: AuthState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const signedOut = (expired: boolean): AuthState => ({ status: "signedOut", expired });

  const adopt = async (granted: Grant, fallbackRefreshToken: string | undefined, generation: number) => {
    const refreshToken = granted.refreshToken ?? fallbackRefreshToken;
    if (!refreshToken) {
      throw new Error("Keycloak granted no refresh token");
    }
    const next = {
      accessToken: granted.accessToken,
      refreshToken,
      expiresAt: now() + granted.expiresInSeconds * 1000,
    };
    await storage.save(next);
    if (generation !== session) {
      await (tokens ? storage.save(tokens) : storage.clear());
      return undefined;
    }
    tokens = next;
    return next;
  };

  const ready = storage.load().then(
    (loaded) => {
      tokens = loaded;
      setState(loaded ? { status: "signedIn" } : signedOut(false));
    },
    () => setState(signedOut(false)),
  );

  const refresh = async (current: StoredTokens): Promise<string | undefined> => {
    const generation = session;
    let outcome: Awaited<ReturnType<OAuthClient["refresh"]>>;
    try {
      outcome = await oauth.refresh(current.refreshToken);
    } catch (cause) {
      throw apiError("network", "Could not refresh the sign-in", { cause });
    }
    if (generation !== session) {
      return undefined;
    }
    if (outcome.kind === "rejected") {
      session += 1;
      tokens = null;
      setState(signedOut(true));
      await storage.clear();
      return undefined;
    }
    const next = await adopt(outcome.grant, current.refreshToken, generation);
    return next?.accessToken;
  };

  const refreshShared = (current: StoredTokens): Promise<string | undefined> => {
    if (refreshing?.generation !== session) {
      const promise = refresh(current).finally(() => {
        if (refreshing?.promise === promise) {
          refreshing = undefined;
        }
      });
      refreshing = { generation: session, promise };
    }
    return refreshing.promise;
  };

  const getAccessToken = async (): Promise<string | undefined> => {
    await ready;
    const current = tokens;
    if (!current) {
      return undefined;
    }
    if (current.expiresAt - now() > EXPIRY_MARGIN_MS) {
      return current.accessToken;
    }
    return refreshShared(current);
  };

  const refreshAccessToken = async (rejected: string | undefined): Promise<string | undefined> => {
    await ready;
    const current = tokens;
    if (!current || rejected === undefined || current.accessToken !== rejected) {
      return getAccessToken();
    }
    return refreshShared(current);
  };

  const signIn = async (locale: string): Promise<SignInResult> => {
    await ready;
    if (state.status === "signedOut" && state.expired) {
      setState(signedOut(false));
    }
    try {
      const outcome = await oauth.authorize(locale);
      if (outcome.kind === "cancelled") {
        return "cancelled";
      }
      session += 1;
      if (!(await adopt(outcome.grant, undefined, session))) {
        return "failed";
      }
      setState({ status: "signedIn" });
      return "signedIn";
    } catch {
      return "failed";
    }
  };

  const signOut = async (): Promise<void> => {
    await ready;
    const forgotten = tokens;
    session += 1;
    tokens = null;
    setState(signedOut(false));
    try {
      await storage.clear();
    } finally {
      if (forgotten) {
        await oauth.revoke(forgotten.refreshToken).catch(() => undefined);
      }
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getAccessToken,
    refreshAccessToken,
    signIn,
    signOut,
  };
};
