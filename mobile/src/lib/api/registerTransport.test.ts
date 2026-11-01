import { kaliaFetch } from "@kalia/api";
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

  const storeHolding = (tokens: StoredTokens) => {
    const storage = {
      load: jest.fn(async () => tokens),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    } satisfies TokenStorage;
    const oauth = { authorize: jest.fn(), refresh, revoke: jest.fn() } satisfies OAuthClient;
    return createTokenStore({ storage, oauth, now: () => START });
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

    it("retries that call with a token once Keycloak answers again", async () => {
      refresh.mockRejectedValueOnce(new TypeError("Network request failed")).mockResolvedValueOnce(granted);
      answer(401, 200);

      await expect(readCatalog()).resolves.toMatchObject({ status: 200 });

      expect([authorizationOf(0), authorizationOf(1)]).toEqual([null, "Bearer renewed"]);
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
