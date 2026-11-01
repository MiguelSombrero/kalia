import { afterEach, describe, expect, it, vi } from "vitest";
import { isApiError } from "./api-error";
import { createFetchTransport } from "./fetch-transport";
import { kaliaFetch, registerTransport } from "./transport";

const baseUrl = () => "http://backend:8080";

const initOf = (fetchMock: { mock: { calls: unknown[] } }): RequestInit =>
  (fetchMock.mock.calls[0] as [string, RequestInit])[1];

describe("createFetchTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("attaches the token its source supplies as a bearer header", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-abc" });

    await transport("/api/v1/cellar", { method: "GET" });

    expect(new Headers(initOf(fetchMock).headers).get("Authorization")).toBe("Bearer token-abc");
  });

  it("sends no Authorization header when the source has no token, or there is no source", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await createFetchTransport({ baseUrl, accessToken: async () => undefined })("/api/v1/beers", {});
    await createFetchTransport({ baseUrl })("/api/v1/beers", {});

    for (const [, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new Headers(init.headers).has("Authorization")).toBe(false);
    }
  });

  it("refuses a caller-set Authorization header, sending nothing", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-abc" });

    const refusal = await transport("/api/v1/cellar", {
      headers: { authorization: "Bearer caller-supplied" },
    }).catch((e: unknown) => e);

    expect(isApiError(refusal) && refusal.kind).toBe("refused");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("with a way to renew a rejected token", () => {
    const answers = (...statuses: number[]) => {
      const fetchMock = vi.fn();
      for (const status of statuses) {
        fetchMock.mockImplementationOnce(async () => Response.json({ status }, { status }));
      }
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    };
    const bearerOf = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
      new Headers((fetchMock.mock.calls[call] as [string, RequestInit])[1].headers).get("Authorization");

    it("retries a 401 once with the renewed token, naming the token it sent", async () => {
      const fetchMock = answers(401, 200);
      const refreshAccessToken = vi.fn(async () => "token-2");
      const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-1", refreshAccessToken });

      const result = await transport<{ status: number }>("/api/v1/cellar", { method: "GET" });

      expect(result.status).toBe(200);
      expect(refreshAccessToken).toHaveBeenCalledExactlyOnceWith("token-1");
      expect([bearerOf(fetchMock, 0), bearerOf(fetchMock, 1)]).toEqual(["Bearer token-1", "Bearer token-2"]);
    });

    it("returns a second 401 as it is, without a further refresh or retry", async () => {
      const fetchMock = answers(401, 401);
      const refreshAccessToken = vi.fn(async () => "token-2");
      const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-1", refreshAccessToken });

      const result = await transport<{ status: number }>("/api/v1/cellar", { method: "GET" });

      expect(result.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["no token", undefined],
      ["the token it already sent", "token-1"],
    ])("returns the 401 without a retry when the renewal gives %s", async (_, renewed) => {
      const fetchMock = answers(401);
      const transport = createFetchTransport({
        baseUrl,
        accessToken: async () => "token-1",
        refreshAccessToken: async () => renewed,
      });

      const result = await transport<{ status: number }>("/api/v1/cellar", { method: "GET" });

      expect(result.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not ask for a renewal on any other status", async () => {
      answers(403, 500);
      const refreshAccessToken = vi.fn(async () => "token-2");
      const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-1", refreshAccessToken });

      await transport("/api/v1/cellar", {});
      await transport("/api/v1/cellar", {});

      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it("leaves a 401 alone when no way to renew was given", async () => {
      const fetchMock = answers(401);
      const transport = createFetchTransport({ baseUrl, accessToken: async () => "token-1" });

      const result = await transport<{ status: number }>("/api/v1/cellar", {});

      expect(result.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    ["a parent segment", "/api/v1/cellars/.."],
    ["a percent-encoded parent segment", "/api/v1/cellars/%2E%2e"],
    ["an empty segment", "/api/v1/cellar/bottles/"],
  ])("refuses a path with %s", async (_, url) => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    const error = await createFetchTransport({ baseUrl })(url, {}).catch((e: unknown) => e);

    expect(isApiError(error) && error.kind).toBe("refused");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefixes the base URL and returns the parsed body with its status and headers", async () => {
    const fetchMock = vi.fn(async () => Response.json({ hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createFetchTransport({ baseUrl })("/api/v1/beers", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledWith("http://backend:8080/api/v1/beers", {
      method: "GET",
      headers: expect.any(Headers),
    });
    expect(result).toEqual({ data: { hello: "world" }, status: 200, headers: expect.any(Headers) });
  });

  it("returns a non-2xx status rather than throwing, with the problem body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ title: "Not found" }, { status: 404 })),
    );

    const result = await createFetchTransport({ baseUrl })("/api/v1/beers/1", {});

    expect(result).toMatchObject({ status: 404, data: { title: "Not found" } });
  });

  it.each([
    ["204", () => new Response(null, { status: 204 })],
    ["a bodyless 404", () => new Response(null, { status: 404 })],
  ])("returns a null body for %s", async (_, response) => {
    vi.stubGlobal("fetch", vi.fn(async () => response()));

    const result = await createFetchTransport({ baseUrl })("/api/v1/beers/1", {});

    expect(result).toMatchObject({ data: null });
  });

  it("raises a parse failure, with the status, when an error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>502</html>", { status: 502 })));

    await expect(createFetchTransport({ baseUrl })("/api/v1/beers", {})).rejects.toMatchObject({
      name: "ApiError",
      kind: "parse",
      status: 502,
    });
  });

  it("maps a lost request to the typed network failure, keeping the cause", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const error = await createFetchTransport({ baseUrl })("/api/v1/beers", {}).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ kind: "network" });
    expect((error as Error).cause).toBeInstanceOf(TypeError);
  });

  it("maps a body that cannot be read to the typed network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        headers: new Headers(),
        text: async () => {
          throw new TypeError("terminated");
        },
      })),
    );

    await expect(createFetchTransport({ baseUrl })("/api/v1/beers", {})).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("maps a backend that does not answer in time to the typed timeout failure", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    const pending = createFetchTransport({ baseUrl, timeoutMs: 2_000 })("/api/v1/beers", {});
    const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(2_000);

    await assertion;
  });

  it("rethrows a caller abort unchanged, so query cancellation is not read as failure", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw abort;
      }),
    );

    const error = await createFetchTransport({ baseUrl })("/api/v1/beers", {}).catch((e: unknown) => e);

    expect(error).toBe(abort);
  });
});

describe("kaliaFetch", () => {
  it("calls the transport registered at startup", async () => {
    const transport = vi.fn(async () => ({ status: 200 }));
    registerTransport(transport as never);

    const result = await kaliaFetch("/api/v1/beers", { method: "GET" });

    expect(transport).toHaveBeenCalledWith("/api/v1/beers", { method: "GET" });
    expect(result).toEqual({ status: 200 });
  });

  it("rejects, naming the path but not the query, when no transport was registered", async () => {
    (globalThis as Record<symbol, unknown>)[Symbol.for("@kalia/api.transport")] = undefined;

    await expect(kaliaFetch("/api/v1/beers?query=westvleteren", {})).rejects.toThrow(
      /No transport registered.*\/api\/v1\/beers$/,
    );
  });
});
