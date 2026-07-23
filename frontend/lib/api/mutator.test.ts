import { afterEach, describe, expect, it, vi } from "vitest";
import { kaliaFetch } from "./mutator";

describe("kaliaFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
});
