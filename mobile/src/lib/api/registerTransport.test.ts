import { kaliaFetch } from "@kalia/api";
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
