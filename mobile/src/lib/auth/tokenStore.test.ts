import { isApiError } from "@kalia/api";
import { createTokenStore, type OAuthClient, type StoredTokens, type TokenStorage } from "./tokenStore";

const START = 1_700_000_000_000;
const FIVE_MINUTES = 300;

const stored = (overrides: Partial<StoredTokens> = {}): StoredTokens => ({
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: START + FIVE_MINUTES * 1000,
  ...overrides,
});

const grant = (n: number, overrides: Record<string, unknown> = {}) => ({
  kind: "granted" as const,
  grant: { accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresInSeconds: FIVE_MINUTES, ...overrides },
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const setup = (initial: StoredTokens | null = stored()) => {
  let clock = START;
  let persisted = initial;
  const storage = {
    load: jest.fn(async () => persisted),
    save: jest.fn(async (tokens: StoredTokens) => {
      persisted = tokens;
    }),
    clear: jest.fn(async () => {
      persisted = null;
    }),
  } satisfies TokenStorage;
  const oauth = {
    authorize: jest.fn(),
    refresh: jest.fn(),
    revoke: jest.fn().mockResolvedValue(undefined),
  } satisfies OAuthClient;
  const store = createTokenStore({ storage, oauth, now: () => clock });
  return {
    store,
    storage,
    oauth,
    persisted: () => persisted,
    advance: (seconds: number) => {
      clock += seconds * 1000;
    },
  };
};

describe("the token store's state", () => {
  it("is loading until secure storage has been read", async () => {
    const { store } = setup();

    expect(store.getState()).toEqual({ status: "loading" });
    await store.getAccessToken();
    expect(store.getState()).toEqual({ status: "signedIn" });
  });

  it("is signed out, without the expiry notice, when nothing is stored", async () => {
    const { store } = setup(null);

    await expect(store.getAccessToken()).resolves.toBeUndefined();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });

  it("tells subscribers when it changes, and stops once they unsubscribe", async () => {
    const { store } = setup(null);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.getAccessToken();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.signOut();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("getAccessToken", () => {
  it("returns the stored access token while it is fresh, without a refresh", async () => {
    const { store, oauth } = setup();

    await expect(store.getAccessToken()).resolves.toBe("access-1");
    expect(oauth.refresh).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token and returns the new one, which is stored", async () => {
    const { store, oauth, advance, persisted } = setup();
    oauth.refresh.mockResolvedValue(grant(2));
    advance(FIVE_MINUTES + 1);

    await expect(store.getAccessToken()).resolves.toBe("access-2");

    expect(oauth.refresh).toHaveBeenCalledTimes(1);
    expect(oauth.refresh).toHaveBeenCalledWith("refresh-1");
    expect(persisted()).toEqual({ accessToken: "access-2", refreshToken: "refresh-2", expiresAt: START + (FIVE_MINUTES + 1 + FIVE_MINUTES) * 1000 });
    expect(store.getState()).toEqual({ status: "signedIn" });
  });

  it("refreshes a token about to expire rather than handing out one that dies in flight", async () => {
    const { store, oauth, advance } = setup();
    oauth.refresh.mockResolvedValue(grant(2));
    advance(FIVE_MINUTES - 10);

    await expect(store.getAccessToken()).resolves.toBe("access-2");
  });

  it("keeps the old refresh token when the answer carries no new one", async () => {
    const { store, oauth, advance, persisted } = setup();
    oauth.refresh.mockResolvedValue(grant(2, { refreshToken: undefined }));
    advance(FIVE_MINUTES + 1);

    await store.getAccessToken();

    expect(persisted()?.refreshToken).toBe("refresh-1");
  });

  it("does not hand out the new access token until the new refresh token is stored", async () => {
    const { store, oauth, storage, advance } = setup();
    const saved = deferred<void>();
    storage.save.mockReturnValueOnce(saved.promise);
    oauth.refresh.mockResolvedValue(grant(2));
    advance(FIVE_MINUTES + 1);

    const settled = jest.fn();
    const token = store.getAccessToken().then(settled);
    await new Promise((resolve) => setImmediate(resolve));

    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: "refresh-2" }));
    expect(settled).not.toHaveBeenCalled();

    saved.resolve();
    await token;
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it("makes one refresh for two calls that find the token expired together, and both use its result", async () => {
    const { store, oauth, advance } = setup();
    const answer = deferred<ReturnType<typeof grant>>();
    oauth.refresh.mockReturnValue(answer.promise);
    advance(FIVE_MINUTES + 1);

    const first = store.getAccessToken();
    const second = store.getAccessToken();
    answer.resolve(grant(2));

    await expect(Promise.all([first, second])).resolves.toEqual(["access-2", "access-2"]);
    expect(oauth.refresh).toHaveBeenCalledTimes(1);
  });

  it("starts a new refresh for a later expiry", async () => {
    const { store, oauth, advance } = setup();
    oauth.refresh.mockResolvedValueOnce(grant(2)).mockResolvedValueOnce(grant(3));

    advance(FIVE_MINUTES + 1);
    await store.getAccessToken();
    advance(FIVE_MINUTES + 1);

    await expect(store.getAccessToken()).resolves.toBe("access-3");
    expect(oauth.refresh).toHaveBeenNthCalledWith(2, "refresh-2");
  });
});

describe("refreshAccessToken", () => {
  it("refreshes a token the server rejected although its local expiry has not passed", async () => {
    const { store, oauth, persisted } = setup();
    oauth.refresh.mockResolvedValue(grant(2));

    await expect(store.refreshAccessToken("access-1")).resolves.toBe("access-2");

    expect(oauth.refresh).toHaveBeenCalledWith("refresh-1");
    expect(persisted()?.accessToken).toBe("access-2");
  });

  it("makes one refresh for calls rejected together, sharing it with getAccessToken", async () => {
    const { store, oauth } = setup();
    const answer = deferred<ReturnType<typeof grant>>();
    oauth.refresh.mockReturnValue(answer.promise);

    const calls = [store.refreshAccessToken("access-1"), store.refreshAccessToken("access-1")];
    answer.resolve(grant(2));

    await expect(Promise.all(calls)).resolves.toEqual(["access-2", "access-2"]);
    expect(oauth.refresh).toHaveBeenCalledTimes(1);
  });

  it("hands out the current token, without a refresh, when the rejected one has already been replaced", async () => {
    const { store, oauth } = setup();
    oauth.refresh.mockResolvedValue(grant(2));
    await store.refreshAccessToken("access-1");

    await expect(store.refreshAccessToken("access-1")).resolves.toBe("access-2");

    expect(oauth.refresh).toHaveBeenCalledTimes(1);
  });

  it("treats a call sent without a token as getAccessToken, which tries the refresh again", async () => {
    const { store, oauth, advance } = setup();
    oauth.refresh.mockRejectedValueOnce(new TypeError("Network request failed")).mockResolvedValueOnce(grant(2));
    advance(FIVE_MINUTES + 1);
    await store.getAccessToken().catch(() => undefined);

    await expect(store.refreshAccessToken(undefined)).resolves.toBe("access-2");
  });

  it("has nothing to refresh when nobody is signed in", async () => {
    const { store, oauth } = setup(null);

    await expect(store.refreshAccessToken(undefined)).resolves.toBeUndefined();

    expect(oauth.refresh).not.toHaveBeenCalled();
  });

  it("ends the session when Keycloak refuses the refresh", async () => {
    const { store, oauth } = setup();
    oauth.refresh.mockResolvedValue({ kind: "rejected" });

    await expect(store.refreshAccessToken("access-1")).resolves.toBeUndefined();

    expect(store.getState()).toEqual({ status: "signedOut", expired: true });
  });

  it("fails the call, leaving the user signed in, when the refresh fails transiently", async () => {
    const { store, oauth } = setup();
    oauth.refresh.mockRejectedValue(new TypeError("Network request failed"));

    const outcome = await store.refreshAccessToken("access-1").catch((error: unknown) => error);

    expect(isApiError(outcome) && outcome.kind).toBe("network");
    expect(store.getState()).toEqual({ status: "signedIn" });
  });
});

describe("a refresh that fails", () => {
  it("with invalid_grant ends the session: storage is cleared and the expiry notice is raised", async () => {
    const { store, oauth, advance, persisted, storage } = setup();
    oauth.refresh.mockResolvedValue({ kind: "rejected" });
    advance(FIVE_MINUTES + 1);

    await expect(store.getAccessToken()).resolves.toBeUndefined();

    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: true });
  });

  it.each([
    ["no connection", new TypeError("Network request failed")],
    ["a server error", new Error("Keycloak answered 503")],
  ])("for %s leaves the user signed in, with storage untouched, and fails the call", async (_name, failure) => {
    const { store, oauth, advance, persisted, storage } = setup();
    oauth.refresh.mockRejectedValue(failure);
    advance(FIVE_MINUTES + 1);

    const outcome = await store.getAccessToken().catch((error: unknown) => error);

    expect(isApiError(outcome) && outcome.kind).toBe("network");
    expect(store.getState()).toEqual({ status: "signedIn" });
    expect(storage.clear).not.toHaveBeenCalled();
    expect(persisted()).toEqual(stored());
  });

  it("for a transient reason is tried again by the next call", async () => {
    const { store, oauth, advance } = setup();
    oauth.refresh.mockRejectedValueOnce(new TypeError("Network request failed")).mockResolvedValueOnce(grant(2));
    advance(FIVE_MINUTES + 1);

    await store.getAccessToken().catch(() => undefined);

    await expect(store.getAccessToken()).resolves.toBe("access-2");
  });

  it("does not bring a session back when it ends after the user signed out", async () => {
    const { store, oauth, advance, persisted } = setup();
    const answer = deferred<ReturnType<typeof grant>>();
    oauth.refresh.mockReturnValue(answer.promise);
    advance(FIVE_MINUTES + 1);

    const pending = store.getAccessToken();
    await store.signOut();
    answer.resolve(grant(2));

    await expect(pending).resolves.toBeUndefined();
    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });
});

describe("a sign-out that overlaps a refresh", () => {
  it("is not undone by the refresh's write to storage", async () => {
    const { store, oauth, storage, advance, persisted } = setup();
    const saved = deferred<void>();
    storage.save.mockImplementationOnce(async () => saved.promise);
    oauth.refresh.mockResolvedValue(grant(2));
    advance(FIVE_MINUTES + 1);

    const pending = store.getAccessToken();
    await new Promise((resolve) => setImmediate(resolve));
    await store.signOut();
    saved.resolve();

    await expect(pending).resolves.toBeUndefined();
    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });

  it("does not hand a later sign-in the discarded refresh's result", async () => {
    const { store, oauth, advance } = setup();
    const answer = deferred<ReturnType<typeof grant>>();
    oauth.refresh.mockReturnValue(answer.promise);
    advance(FIVE_MINUTES + 1);
    const stale = store.getAccessToken();
    await store.signOut();
    oauth.authorize.mockResolvedValue(grant(5));
    await store.signIn("en");

    await expect(store.getAccessToken()).resolves.toBe("access-5");

    answer.resolve(grant(2));
    await expect(stale).resolves.toBeUndefined();
  });
});

describe("signIn", () => {
  it("stores the tokens of a completed sign-in and signs in, in the app's language", async () => {
    const { store, oauth, persisted } = setup(null);
    oauth.authorize.mockResolvedValue(grant(1));

    await expect(store.signIn("fi")).resolves.toBe("signedIn");

    expect(oauth.authorize).toHaveBeenCalledWith("fi");
    expect(persisted()).toEqual(stored());
    expect(store.getState()).toEqual({ status: "signedIn" });
    await expect(store.getAccessToken()).resolves.toBe("access-1");
  });

  it("returns quietly to signed out when the user cancels", async () => {
    const { store, oauth, persisted } = setup(null);
    oauth.authorize.mockResolvedValue({ kind: "cancelled" });

    await expect(store.signIn("en")).resolves.toBe("cancelled");

    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });

  it("reports a failed sign-in and stays signed out", async () => {
    const { store, oauth } = setup(null);
    oauth.authorize.mockRejectedValue(new Error("code exchange refused"));

    await expect(store.signIn("en")).resolves.toBe("failed");

    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });

  it("drops the expiry notice once a new sign-in starts", async () => {
    const { store, oauth, advance } = setup();
    oauth.refresh.mockResolvedValue({ kind: "rejected" });
    advance(FIVE_MINUTES + 1);
    await store.getAccessToken();
    oauth.authorize.mockResolvedValue({ kind: "cancelled" });

    await store.signIn("en");

    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });
});

describe("signOut", () => {
  it("forgets the tokens on the device and revokes the refresh token at Keycloak", async () => {
    const { store, oauth, storage, persisted } = setup();
    await store.getAccessToken();

    await store.signOut();

    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(persisted()).toBeNull();
    expect(oauth.revoke).toHaveBeenCalledTimes(1);
    expect(oauth.revoke).toHaveBeenCalledWith("refresh-1");
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
    await expect(store.getAccessToken()).resolves.toBeUndefined();
  });

  it("is signed out and cleared before the revocation is even attempted", async () => {
    const { store, oauth, persisted } = setup();
    await store.getAccessToken();
    const revoked = deferred<void>();
    oauth.revoke.mockReturnValue(revoked.promise);

    const done = store.signOut();
    await new Promise((resolve) => setImmediate(resolve));

    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
    revoked.resolve();
    await done;
  });

  it("completes offline: the tokens are forgotten even though the revocation fails", async () => {
    const { store, oauth, persisted } = setup();
    await store.getAccessToken();
    oauth.revoke.mockRejectedValue(new TypeError("Network request failed"));

    await expect(store.signOut()).resolves.toBeUndefined();

    expect(persisted()).toBeNull();
    expect(store.getState()).toEqual({ status: "signedOut", expired: false });
  });

  it("does nothing at Keycloak when nobody is signed in", async () => {
    const { store, oauth } = setup(null);

    await store.signOut();

    expect(oauth.revoke).not.toHaveBeenCalled();
  });
});
