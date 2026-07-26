import { afterEach, describe, expect, it, vi } from "vitest";
import { isApiError } from "./api-error";
import { kaliaFetch } from "./mutator";

describe("kaliaFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("prefixes the backend URL and parses the JSON body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BACKEND_URL", "http://backend:8080");

    const result = await kaliaFetch<{ data: unknown; status: number }>("/api/v1/beers", {
      method: "GET",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://backend:8080/api/v1/beers", { method: "GET" });
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
});
