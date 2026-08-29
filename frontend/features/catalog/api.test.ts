import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBeerSearchParams, getBeer, searchBeers } from "./api";
import type { BeerDetails, BeerPage } from "./types";

describe("buildBeerSearchParams", () => {
  it("omits missing and empty values", () => {
    const params = buildBeerSearchParams({ query: "", style: undefined });

    expect(params.toString()).toBe("");
  });

  it("includes provided filters", () => {
    const params = buildBeerSearchParams({
      query: "westvleteren",
      style: "Quadrupel",
      country: "Belgium",
      minAbv: "9",
      maxAbv: "12",
      page: "1",
      size: "10",
      sort: "abv,desc",
    });

    expect(params.get("query")).toBe("westvleteren");
    expect(params.get("style")).toBe("Quadrupel");
    expect(params.get("country")).toBe("Belgium");
    expect(params.get("minAbv")).toBe("9");
    expect(params.get("maxAbv")).toBe("12");
    expect(params.get("page")).toBe("1");
    expect(params.get("size")).toBe("10");
    expect(params.get("sort")).toBe("abv,desc");
  });
});

const emptyPage: BeerPage = { content: [], totalElements: 0, totalPages: 0, page: 0 };

const requestUrl = (fetchMock: ReturnType<typeof vi.fn>): URL =>
  new URL(String(fetchMock.mock.calls[0][0]));

describe("searchBeers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends numeric-string filters and pagination as coerced query params", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({ query: "ipa", minAbv: "4.5", maxAbv: "9", page: "2", size: "24" });

    const params = requestUrl(fetchMock).searchParams;
    expect(params.get("query")).toBe("ipa");
    expect(params.get("minAbv")).toBe("4.5");
    expect(params.get("maxAbv")).toBe("9");
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("24");
  });

  it("drops empty numeric strings rather than sending them", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({ minAbv: "", maxAbv: "", page: "", size: "" });

    const url = requestUrl(fetchMock).toString();
    expect(url).not.toContain("minAbv");
    expect(url).not.toContain("maxAbv");
    expect(url).not.toContain("page");
    expect(url).not.toContain("size");
  });

  it("returns the page payload on a 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(emptyPage)));

    await expect(searchBeers({})).resolves.toEqual(emptyPage);
  });

  it("throws a tagged http ApiError on a non-200 status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

    const error = await searchBeers({}).catch((e: unknown) => e);

    expect(error).toMatchObject({ name: "ApiError", kind: "http", status: 503 });
    expect((error as Error).message).toBe("Beer search failed with status 503");
  });
});

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";

const westvleteren12: BeerDetails = {
  id: beerId,
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  description: "Dark strong Trappist ale.",
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren", country: "Belgium", city: "Vleteren" },
};

describe("getBeer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the beer from the backend", async () => {
    const fetchMock = vi.fn(async () => Response.json(westvleteren12));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBeer(beerId)).resolves.toEqual(westvleteren12);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/beers/${beerId}`),
      expect.anything(),
    );
  });

  it("returns null when the backend answers 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(getBeer(beerId)).resolves.toBeNull();
  });

  it("returns null for a malformed id without calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBeer("not-a-uuid")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on other backend errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(getBeer(beerId)).rejects.toThrow("status 500");
  });
});
