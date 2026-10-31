import { kaliaFetch } from "@kalia/api";
import { registerMobileTransport } from "./registerTransport";

const SLOT = Symbol.for("@kalia/api.transport");

describe("registerMobileTransport", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, SLOT);
    fetchMock.mockReset().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
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

  it("sends no Authorization header until a token source is registered", async () => {
    registerMobileTransport();

    await kaliaFetch("/api/v1/beers", { method: "GET" });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("throws when no transport was registered", async () => {
    await expect(kaliaFetch("/api/v1/beers", { method: "GET" })).rejects.toThrow("No transport registered");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
