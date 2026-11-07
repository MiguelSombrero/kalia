import { isApiError, kaliaFetch, traceIdOf } from "@kalia/api";
import { createTokenStore, type OAuthClient, type StoredTokens, type TokenStorage } from "@/lib/auth/tokenStore";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { registerMobileTransport } from "./registerTransport";

const SLOT = Symbol.for("@kalia/api.transport");

describe("registerMobileTransport", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    fetchMock.mockReset().mockImplementation(async () => new Response('{"ok":true}', { status: 200 }));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  });

  afterEach(() => jest.restoreAllMocks());

  it("sends a generated-client call to the configured API origin", async () => {
    registerMobileTransport();

    const result = await kaliaFetch<{ data: unknown; status: number }>("/api/v1/beers?page=0", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/v1/beers?page=0");
    expect(result).toMatchObject({ status: 200, data: { ok: true } });
  });

  it("sends no Authorization header while nobody is signed in", async () => {
    registerMobileTransport(fakeTokenStore({ status: "signedOut", expired: false }));

    await kaliaFetch("/api/v1/beers", { method: "GET" });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("sends the signed-in user's access token as a bearer token", async () => {
    registerMobileTransport(fakeTokenStore({ status: "signedIn" }));

    await kaliaFetch("/api/v1/profile", { method: "GET" });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("asks the token store for the token on every call, so a refresh is picked up", async () => {
    const store = fakeTokenStore({ status: "signedIn" });
    store.getAccessToken.mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    registerMobileTransport(store);

    await kaliaFetch("/api/v1/profile", { method: "GET" });
    await kaliaFetch("/api/v1/profile", { method: "GET" });

    expect(fetchMock.mock.calls.map(([, init]) => new Headers(init.headers).get("Authorization"))).toEqual([
      "Bearer first",
      "Bearer second",
    ]);
  });

  it("throws when no transport was registered", async () => {
    await expect(kaliaFetch("/api/v1/beers", { method: "GET" })).rejects.toThrow("No transport registered");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("a token the app cannot use", () => {
  const START = 1_700_000_000_000;
  const fetchMock = jest.fn();
  const refresh = jest.fn();

  let clock = START;
  const storeHolding = (tokens: StoredTokens) => {
    const storage = {
      load: jest.fn(async () => tokens),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    } satisfies TokenStorage;
    const oauth = { authorize: jest.fn(), refresh, revoke: jest.fn() } satisfies OAuthClient;
    return createTokenStore({ storage, oauth, now: () => clock });
  };
  const expired = { accessToken: "stale", refreshToken: "refresh-1", expiresAt: START - 1000 };
  const fresh = { accessToken: "stale", refreshToken: "refresh-1", expiresAt: START + 300_000 };
  const granted = { kind: "granted", grant: { accessToken: "renewed", refreshToken: "refresh-2", expiresInSeconds: 300 } };

  type Reply = { status: number };
  const readCatalog = () => kaliaFetch<Reply>("/api/v1/beers?page=0&size=20", { method: "GET" });
  const readLaunchCheck = () => kaliaFetch<Reply>("/api/v1/app-config", { method: "GET" });
  const readProfile = () => kaliaFetch<Reply>("/api/v1/profile", { method: "GET" });
  const authorizationOf = (call: number) => new Headers(fetchMock.mock.calls[call][1].headers).get("Authorization");
  const answer = (...statuses: number[]) => {
    for (const status of statuses) {
      fetchMock.mockImplementationOnce(async () => new Response(status === 200 ? '{"content":[]}' : "{}", { status }));
    }
  };

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    clock = START;
    fetchMock.mockReset();
    refresh.mockReset();
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("when Keycloak cannot be reached for the refresh", () => {
    beforeEach(() => {
      refresh.mockRejectedValue(new TypeError("Network request failed"));
      registerMobileTransport(storeHolding(expired));
    });

    it("still lists the catalog, without a token", async () => {
      answer(200);

      await expect(readCatalog()).resolves.toMatchObject({ status: 200 });
      expect(authorizationOf(0)).toBeNull();
    });

    it("still answers the launch check, without a token", async () => {
      answer(200);

      await expect(readLaunchCheck()).resolves.toMatchObject({ status: 200 });
      expect(authorizationOf(0)).toBeNull();
    });

    it("leaves a call that needs a user to the API's 401", async () => {
      answer(401);

      await expect(readProfile()).resolves.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("when Keycloak is slow rather than down", () => {
    const timedOut = new Error("The refresh timed out after 10000 ms");

    beforeEach(() => {
      refresh.mockRejectedValue(timedOut);
      registerMobileTransport(storeHolding(expired));
    });

    it("sends the calls of the next 30 seconds at once, without a token, and tries again after them", async () => {
      answer(200, 200, 200);

      await readCatalog();
      expect(refresh).toHaveBeenCalledTimes(1);

      clock += 29_000;
      await readCatalog();
      await readLaunchCheck();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect([authorizationOf(1), authorizationOf(2)]).toEqual([null, null]);

      refresh.mockResolvedValueOnce(granted);
      answer(200);
      clock += 1_000;
      await readCatalog();
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(authorizationOf(3)).toBe("Bearer renewed");
    });

    it("leaves a call that needs a user to the API's 401 inside the window, without a refresh", async () => {
      answer(200, 401);
      await readCatalog();

      await expect(readProfile()).resolves.toMatchObject({ status: 401 });

      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the API answers 401", () => {
    it("refreshes once and retries the call with the new token", async () => {
      refresh.mockResolvedValue(granted);
      registerMobileTransport(storeHolding(fresh));
      answer(401, 200);

      await expect(readCatalog()).resolves.toMatchObject({ status: 200 });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect([authorizationOf(0), authorizationOf(1)]).toEqual(["Bearer stale", "Bearer renewed"]);
    });

    it("shares one refresh between concurrent calls and retries each of them", async () => {
      refresh.mockResolvedValue(granted);
      registerMobileTransport(storeHolding(fresh));
      answer(401, 401, 200, 200);

      await expect(Promise.all([readCatalog(), readCatalog()])).resolves.toMatchObject([{ status: 200 }, { status: 200 }]);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("shows the error after a second 401, without signing the user out", async () => {
      refresh.mockResolvedValue(granted);
      const store = storeHolding(fresh);
      registerMobileTransport(store);
      answer(401, 401);

      await expect(readProfile()).resolves.toMatchObject({ status: 401 });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(store.getState()).toEqual({ status: "signedIn" });
    });

    it("does not retry when the refresh fails transiently, and shows the 401", async () => {
      refresh.mockRejectedValue(new TypeError("Network request failed"));
      const store = storeHolding(fresh);
      registerMobileTransport(store);
      answer(401);

      await expect(readProfile()).resolves.toMatchObject({ status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ status: "signedIn" });
    });

    it("ends the session when Keycloak refuses the refresh", async () => {
      refresh.mockResolvedValue({ kind: "rejected" });
      const store = storeHolding(fresh);
      registerMobileTransport(store);
      answer(401);

      await expect(readProfile()).resolves.toMatchObject({ status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ status: "signedOut", expired: true });
    });
  });
});

describe("a call's trace", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    fetchMock.mockReset().mockImplementation(async () => new Response("{}", { status: 200 }));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    registerMobileTransport(fakeTokenStore({ status: "signedOut", expired: false }));
  });

  afterEach(() => jest.restoreAllMocks());

  const sentTraceparents = () =>
    fetchMock.mock.calls.map(([, init]) => new Headers(init.headers).get("traceparent"));

  it.each([
    ["the catalog", "/api/v1/beers?page=0&size=20"],
    ["the launch check", "/api/v1/app-config"],
    ["the profile", "/api/v1/profile"],
  ])("is sent with the call that reads %s, as a valid traceparent", async (_, url) => {
    await kaliaFetch(url, { method: "GET" });

    const [sent] = sentTraceparents();
    expect(sent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(traceIdOf(sent)).toBeDefined();
  });

  it("starts a new trace for each call", async () => {
    await kaliaFetch("/api/v1/beers", { method: "GET" });
    await kaliaFetch("/api/v1/beers", { method: "GET" });

    const [first, second] = sentTraceparents().map(traceIdOf);
    expect(first).not.toBe(second);
  });
});

describe("a failed request", () => {
  const fetchMock = jest.fn();
  const devFlag = globalThis as { __DEV__?: boolean };
  const original = devFlag.__DEV__;
  const TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJqb3VuaSJ9.c2lnbmF0dXJl";
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    fetchMock.mockReset().mockRejectedValue(new TypeError("Network request failed"));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = fakeTokenStore({ status: "signedIn" });
    store.getAccessToken.mockResolvedValue(TOKEN);
    registerMobileTransport(store);
  });

  afterEach(() => {
    devFlag.__DEV__ = original;
    jest.restoreAllMocks();
  });

  const fetchProfile = () => kaliaFetch("/api/v1/profile?username=jouni&token=secret", { method: "GET" });
  const loggedLine = (spy: jest.SpyInstance) => JSON.parse(spy.mock.calls[0][0]);
  const sentTraceId = () => traceIdOf(new Headers(fetchMock.mock.calls[0][1].headers).get("traceparent"));

  it("logs one line to the device log naming the trace id its error names, in a release build", async () => {
    devFlag.__DEV__ = false;

    const failure = await fetchProfile().catch((e: unknown) => e);

    expect(error).toHaveBeenCalledTimes(1);
    expect(loggedLine(error)).toEqual({
      level: "error",
      message: "Request failed",
      method: "GET",
      path: "/api/v1/profile",
      kind: "network",
      traceId: sentTraceId(),
    });
    expect(isApiError(failure) && failure.traceId).toBe(sentTraceId());
    expect((failure as Error).message).toContain(sentTraceId());
    expect(warn).not.toHaveBeenCalled();
  });

  it("is written as a warning by a development build, which Metro shows without LogBox's error overlay", async () => {
    devFlag.__DEV__ = true;

    await expect(fetchProfile()).rejects.toMatchObject({ kind: "network" });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a timeout", async () => {
    devFlag.__DEV__ = false;
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    jest.useFakeTimers();
    try {
      const outcome = expect(fetchProfile()).rejects.toMatchObject({ kind: "timeout" });
      await jest.advanceTimersByTimeAsync(10_001);
      await outcome;
    } finally {
      jest.useRealTimers();
    }

    expect(loggedLine(error)).toMatchObject({ message: "Request failed", kind: "timeout", traceId: sentTraceId() });
  });

  it("logs an error status the API answered with, and still returns it", async () => {
    devFlag.__DEV__ = false;
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 503 }));

    await expect(fetchProfile()).resolves.toMatchObject({ status: 503 });

    expect(loggedLine(error)).toEqual({
      level: "error",
      message: "Request answered with an error status",
      method: "GET",
      path: "/api/v1/profile",
      status: 503,
      traceId: sentTraceId(),
    });
  });

  describe("an error status", () => {
    beforeEach(() => {
      devFlag.__DEV__ = false;
    });

    const answeredWith = (status: number) => fetchMock.mockReset().mockResolvedValue(new Response("{}", { status }));
    const readBeer = (answers?: number[]) => kaliaFetch("/api/v1/beers/7", { method: "GET", answers });

    it("is not logged when the call reads it as an answer, and is still returned", async () => {
      answeredWith(404);

      await expect(readBeer([404])).resolves.toMatchObject({ status: 404 });

      expect(error).not.toHaveBeenCalled();
    });

    it("is logged when the call did not declare it", async () => {
      answeredWith(404);

      await readBeer();

      expect(loggedLine(error)).toMatchObject({ status: 404, path: "/api/v1/beers/{id}" });
    });

    it("is logged when the call declared a different status", async () => {
      answeredWith(500);

      await readBeer([404]);

      expect(loggedLine(error)).toMatchObject({ message: "Request answered with an error status", status: 500 });
    });

    it.each([409, 429])("is not logged as %i when the call declares it, as the call says", async (status) => {
      answeredWith(status);

      await kaliaFetch("/api/v1/cellar/bottles", { method: "POST", answers: [409, 429] });

      expect(error).not.toHaveBeenCalled();
    });

    it("is logged as 429 unless declared, since the app should never reach the limit", async () => {
      answeredWith(429);

      await readBeer([404]);

      expect(loggedLine(error)).toMatchObject({ status: 429 });
    });
  });

  it("logs the route template of a failed call to a user's cellar, never the user's name", async () => {
    devFlag.__DEV__ = false;

    await kaliaFetch("/api/v1/cellars/jouni?page=0", { method: "GET" }).catch(() => undefined);

    expect(loggedLine(error)).toMatchObject({ path: "/api/v1/cellars/{username}" });
    expect(JSON.stringify(error.mock.calls)).not.toContain("jouni");
  });

  it("logs a status line with the route template of the call, never the user's name", async () => {
    devFlag.__DEV__ = false;
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 500 }));

    await kaliaFetch("/api/v1/cellars/jouni", { method: "GET" });

    expect(loggedLine(error)).toMatchObject({ path: "/api/v1/cellars/{username}", status: 500 });
    expect(JSON.stringify(error.mock.calls)).not.toContain("jouni");
  });

  it("logs nothing for a call that succeeded", async () => {
    devFlag.__DEV__ = false;
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));

    await fetchProfile();

    expect(error).not.toHaveBeenCalled();
  });

  it("puts neither the token, the query string nor the user's name in its line or its error", async () => {
    devFlag.__DEV__ = false;

    const failure = await fetchProfile().catch((e: unknown) => e);

    const everything = JSON.stringify(error.mock.calls) + String(failure);
    expect(everything).not.toMatch(/eyJ|jouni|secret|Bearer|\?/);
  });
});

describe("a 401 in the log", () => {
  const fetchMock = jest.fn();
  const devFlag = globalThis as { __DEV__?: boolean };
  const original = devFlag.__DEV__;
  let error: jest.SpyInstance;

  const storeThatRenews = () => {
    const storage = {
      load: jest.fn(async () => ({ accessToken: "stale", refreshToken: "refresh-1", expiresAt: Date.now() + 300_000 })),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    } satisfies TokenStorage;
    const oauth = {
      authorize: jest.fn(),
      refresh: jest.fn(async () => ({
        kind: "granted" as const,
        grant: { accessToken: "renewed", refreshToken: "refresh-2", expiresInSeconds: 300 },
      })),
      revoke: jest.fn(),
    } satisfies OAuthClient;
    return createTokenStore({ storage, oauth, now: Date.now });
  };

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    devFlag.__DEV__ = false;
    fetchMock.mockReset();
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    registerMobileTransport(storeThatRenews());
  });

  afterEach(() => {
    devFlag.__DEV__ = original;
    jest.restoreAllMocks();
  });

  it("writes no line when the refresh resolves it", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await expect(kaliaFetch("/api/v1/profile", { method: "GET" })).resolves.toMatchObject({ status: 200 });

    expect(error).not.toHaveBeenCalled();
  });

  it("writes one line when the retry is answered 401 too", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 401 }));

    await kaliaFetch("/api/v1/profile", { method: "GET" });

    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(error.mock.calls[0][0])).toMatchObject({ status: 401, path: "/api/v1/profile" });
  });
});
