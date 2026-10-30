import { afterEach, describe, expect, it, vi } from "vitest";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount } from "@/lib/auth/valkeyAdapter";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics/metrics";
import { isApiError } from "@kalia/api";
import { kaliaFetch } from "./mutator";
import { currentClientAddress } from "./requestClient";
import { currentTraceparent } from "./requestTrace";

vi.mock("@/lib/auth/valkeyAdapter", () => ({ getSessionAccount: vi.fn() }));
vi.mock("@/lib/auth/sessionCookie", () => ({ currentSessionToken: vi.fn() }));
vi.mock("./requestClient", () => ({ currentClientAddress: vi.fn(async () => undefined) }));
vi.mock("./requestTrace", () => ({ currentTraceparent: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** The RequestInit kaliaFetch handed to fetch on its first call. */
const initOf = (fetchMock: { mock: { calls: unknown[] } }): RequestInit =>
  (fetchMock.mock.calls[0] as [string, RequestInit])[1];

const givenSignedInWithToken = (accessToken: string | undefined) => {
  vi.mocked(currentSessionToken).mockResolvedValue("session-abc");
  vi.mocked(getSessionAccount).mockResolvedValue({
    access_token: accessToken,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  } as never);
};

describe("kaliaFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.mocked(currentSessionToken).mockResolvedValue(undefined);
    vi.mocked(currentTraceparent).mockResolvedValue(undefined);
    vi.mocked(currentClientAddress).mockResolvedValue(undefined);
    vi.clearAllMocks();
    metrics.backendCallFailures.reset();
  });

  it("attaches the signed-in caller's access token as a bearer header", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    givenSignedInWithToken("token-abc");

    await kaliaFetch("/api/v1/cellar", { method: "GET" });

    const headers = new Headers(initOf(fetchMock).headers);
    expect(headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("sends no Authorization header when nobody is signed in", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await kaliaFetch("/api/v1/beers", { method: "GET" });

    // An empty Authorization header would make the backend reject this.
    expect(new Headers(initOf(fetchMock).headers).has("Authorization")).toBe(false);
  });

  it("sends no Authorization header when the session has no stored token", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    givenSignedInWithToken(undefined);

    await kaliaFetch("/api/v1/beers", { method: "GET" });

    expect(new Headers(initOf(fetchMock).headers).has("Authorization")).toBe(false);
  });

  it.each([
    ["a plain object", { Authorization: "Bearer caller-supplied" }],
    ["a lower-cased name", { authorization: "Bearer caller-supplied" }],
    ["a Headers instance", new Headers({ Authorization: "Bearer caller-supplied" })],
    ["a tuple list", [["Authorization", "Bearer caller-supplied"]] as [string, string][]],
  ])("refuses a caller-set Authorization header given as %s, sending nothing", async (_, headers) => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    givenSignedInWithToken("token-abc");

    const refusal = await kaliaFetch("/api/v1/cellar", { method: "GET", headers }).catch(
      (e: unknown) => e,
    );

    expect(isApiError(refusal) && refusal.kind).toBe("refused");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a parent segment", "/api/v1/cellars/.."],
    ["a current segment", "/api/v1/cellars/."],
    ["a percent-encoded parent segment", "/api/v1/cellars/%2E%2e"],
    ["a mixed-spelling parent segment", "/api/v1/cellars/.%2e?page=1"],
    ["an empty segment", "/api/v1/cellar/bottles/"],
  ])("refuses a path with %s instead of letting it reshape the route", async (_, url) => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    givenSignedInWithToken("token-abc");

    const error = await kaliaFetch(url, { method: "GET" }).catch((e: unknown) => e);

    expect(isApiError(error) && error.kind).toBe("refused");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a path whose segments only contain dots among other characters", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BACKEND_URL", "http://backend:8080");

    await kaliaFetch("/api/v1/cellars/a..b?q=..", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledWith("http://backend:8080/api/v1/cellars/a..b?q=..", {
      method: "GET",
      headers: expect.any(Headers),
    });
  });

  it("prefixes the backend URL and parses the JSON body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BACKEND_URL", "http://backend:8080");

    const result = await kaliaFetch<{ data: unknown; status: number }>("/api/v1/beers", {
      method: "GET",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://backend:8080/api/v1/beers", {
      method: "GET",
      headers: expect.any(Headers),
    });
    expect(result).toEqual({
      data: { hello: "world" },
      status: 200,
      headers: expect.any(Headers),
    });
  });

  it("returns a null body for 204/205/304 responses without parsing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    const result = await kaliaFetch<{ data: unknown }>("/api/v1/beers/1", { method: "DELETE" });

    expect(result.data).toBeNull();
  });

  it("returns a null body for a non-204 response with no body, instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    const result = await kaliaFetch<{ data: unknown; status: number }>("/api/v1/beers/1", {
      method: "GET",
    });

    expect(result).toMatchObject({ data: null, status: 404 });
  });

  it("raises a parse ApiError instead of crashing when an error body is not JSON", async () => {
    // A proxy answering with an HTML error page rather than problem+json.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>502 Bad Gateway</html>", { status: 502 })),
    );

    await expect(kaliaFetch("/api/v1/beers", { method: "GET" })).rejects.toMatchObject({
      name: "ApiError",
      kind: "parse",
      status: 502,
    });
  });

  it("raises a network ApiError when the request never reaches the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const error = await kaliaFetch("/api/v1/beers", { method: "GET" }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ kind: "network" });
    expect((error as Error).cause).toBeInstanceOf(TypeError);
  });

  it("raises a timeout ApiError when the backend does not answer in time", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    const pending = kaliaFetch("/api/v1/beers", { method: "GET" });
    const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(10_000);

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

    const error = await kaliaFetch("/api/v1/beers", { method: "GET" }).catch((e: unknown) => e);

    expect(error).toBe(abort);
    expect(isApiError(error)).toBe(false);
  });

  it("passes the caller's signal through untouched, keeping fetch memoizable", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await kaliaFetch("/api/v1/beers", { method: "GET", signal: controller.signal });

    // Next.js opts a request out of per-render memoization when a signal is
    // present, so the mutator must never add one of its own.
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      method: "GET",
      headers: expect.any(Headers),
      signal: controller.signal,
    });
  });

  it("raises a network ApiError when the body cannot be read", async () => {
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

    await expect(kaliaFetch("/api/v1/beers", { method: "GET" })).rejects.toMatchObject({
      name: "ApiError",
      kind: "network",
    });
  });
  describe("client address", () => {
    it("forwards the address the edge proxy named, replacing a caller-set one", async () => {
      const fetchMock = vi.fn(async () => Response.json({}));
      vi.stubGlobal("fetch", fetchMock);
      vi.mocked(currentClientAddress).mockResolvedValue("203.0.113.5");

      await kaliaFetch("/api/v1/beers", {
        method: "GET",
        headers: { "X-Forwarded-For": "198.51.100.1" },
      });

      expect(new Headers(initOf(fetchMock).headers).get("X-Forwarded-For")).toBe("203.0.113.5");
    });

    it("sends none outside a request, and drops a caller-set one", async () => {
      const fetchMock = vi.fn(async () => Response.json({}));
      vi.stubGlobal("fetch", fetchMock);

      await kaliaFetch("/api/v1/beers", {
        method: "GET",
        headers: { "X-Forwarded-For": "198.51.100.1" },
      });

      expect(new Headers(initOf(fetchMock).headers).has("X-Forwarded-For")).toBe(false);
    });
  });

  describe("tracing and logging", () => {
    const incoming = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    it("forwards the traceparent of the request being served, unchanged", async () => {
      const fetchMock = vi.fn(async () => Response.json({}));
      vi.stubGlobal("fetch", fetchMock);
      vi.mocked(currentTraceparent).mockResolvedValue(incoming);

      await kaliaFetch("/api/v1/beers", { method: "GET" });

      expect(new Headers(initOf(fetchMock).headers).get("traceparent")).toBe(incoming);
    });

    it("starts a trace of its own outside any request", async () => {
      const fetchMock = vi.fn(async () => Response.json({}));
      vi.stubGlobal("fetch", fetchMock);

      await kaliaFetch("/api/v1/beers", { method: "GET" });

      expect(new Headers(initOf(fetchMock).headers).get("traceparent")).toMatch(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
      );
    });

    it("replaces a caller-set traceparent rather than forwarding it", async () => {
      const fetchMock = vi.fn(async () => Response.json({}));
      vi.stubGlobal("fetch", fetchMock);
      vi.mocked(currentTraceparent).mockResolvedValue(incoming);

      await kaliaFetch("/api/v1/beers", {
        method: "GET",
        headers: { traceparent: "00-11111111111111111111111111111111-2222222222222222-01" },
      });

      expect(new Headers(initOf(fetchMock).headers).get("traceparent")).toBe(incoming);
    });

    it("logs the call under the same trace id it sent, without the query string", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
      vi.mocked(currentTraceparent).mockResolvedValue(incoming);

      await kaliaFetch("/api/v1/beers?query=westvleteren", { method: "GET" });

      expect(logger.info).toHaveBeenCalledExactlyOnceWith(
        "Backend call completed",
        expect.objectContaining({
          traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
          method: "GET",
          path: "/api/v1/beers",
          status: 200,
        }),
      );
      expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain("westvleteren");
    });

    it("counts and warns about a server error the backend answered", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

      await kaliaFetch("/api/v1/beers", { method: "GET" });

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        "Backend answered with a server error",
        expect.objectContaining({ status: 503 }),
      );
      expect((await metrics.backendCallFailures.get()).values).toEqual([
        expect.objectContaining({ labels: { kind: "http_5xx" }, value: 1 }),
      ]);
    });

    it("counts and warns about a backend that cannot be reached", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));

      await kaliaFetch("/api/v1/beers", { method: "GET" }).catch(() => undefined);

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        "Backend call failed",
        expect.objectContaining({ kind: "network", path: "/api/v1/beers" }),
      );
      expect((await metrics.backendCallFailures.get()).values).toEqual([
        expect.objectContaining({ labels: { kind: "network" }, value: 1 }),
      ]);
    });

    describe("on a failure", () => {
      const search = "/api/v1/beers?query=westvleteren";
      const unreadableBody = () =>
        ({
          status: 200,
          headers: new Headers(),
          text: async () => {
            throw new TypeError("terminated");
          },
        }) as unknown as Response;

      it.each([
        ["a backend that cannot be reached", "network", search, () => {
          vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
        }],
        ["a body that cannot be read", "network", search, () => {
          vi.stubGlobal("fetch", vi.fn(async () => unreadableBody()));
        }],
        ["a body that is not JSON", "parse", search, () => {
          vi.stubGlobal("fetch", vi.fn(async () => new Response("<html></html>", { status: 502 })));
        }],
        ["a backend that does not answer in time", "timeout", search, () => {
          vi.useFakeTimers();
          vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
        }],
        ["a path that would reshape the route", "refused", "/api/v1/cellars/..?query=westvleteren", () => {
          vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
        }],
      ])(
        "logs and raises %s without the query string",
        async (_, kind, url, arrange) => {
          arrange();

          const pending = kaliaFetch(url, { method: "GET" }).catch((e: unknown) => e);
          await vi.advanceTimersByTimeAsync(10_000).catch(() => undefined);
          const error = await pending;

          expect(isApiError(error) && error.kind).toBe(kind);
          expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
            "Backend call failed",
            expect.objectContaining({ kind, path: url.split("?", 1)[0] }),
          );
          expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("westvleteren");
          expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(
            "westvleteren",
          );
        },
      );

      it("logs and raises a caller-set Authorization header's refusal without the query string", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));

        const error = await kaliaFetch(search, {
          method: "GET",
          headers: { Authorization: "Bearer caller-supplied" },
        }).catch((e: unknown) => e);

        expect(isApiError(error) && error.kind).toBe("refused");
        expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("westvleteren");
        expect((error as Error).message).not.toContain("westvleteren");
      });
    });

    it("neither logs nor counts a caller's own abort", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Promise.reject(new DOMException("aborted", "AbortError"))),
      );

      await kaliaFetch("/api/v1/beers", { method: "GET" }).catch(() => undefined);

      expect(logger.warn).not.toHaveBeenCalled();
      expect((await metrics.backendCallFailures.get()).values).toEqual([]);
    });
  });
});
