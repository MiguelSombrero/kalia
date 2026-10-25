import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addBeer,
  findBreweries,
  getBeer,
  listBreweryBeers,
  listCountries,
  listStyles,
  searchBeers,
} from "./api";
import type { BeerDetails, BeerPage } from "./types";

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

  it.each(["name,asc", "name,desc", "abv,asc", "abv,desc", "style,asc"])(
    "sends %s unchanged — the values SearchFilters actually offers",
    async (sort) => {
      const fetchMock = vi.fn(async () => Response.json(emptyPage));
      vi.stubGlobal("fetch", fetchMock);

      await searchBeers({ sort });

      expect(requestUrl(fetchMock).searchParams.get("sort")).toBe(sort);
    },
  );

  it("omits sort rather than sending it, when the param is absent", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({});

    expect(requestUrl(fetchMock).searchParams.has("sort")).toBe(false);
  });

  it.each([
    ["abv,dsc", "an unrecognized direction"],
    ["abv,asc,extra", "more than two comma-separated parts"],
  ])("leaves %s (%s) out rather than reaching the backend", async (sort) => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({ sort });

    expect(requestUrl(fetchMock).searchParams.has("sort")).toBe(false);
  });

  it("leaves out every value the backend would refuse, and sends the rest", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({
      query: "a".repeat(101),
      style: "IPA",
      countryCode: "finland",
      minAbv: "150",
      maxAbv: "strong",
      page: "9999",
      size: "0",
    });

    expect([...requestUrl(fetchMock).searchParams]).toEqual([["style", "IPA"]]);
  });

  it("sends a minimum ABV above the maximum swapped", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await searchBeers({ minAbv: "12", maxAbv: "9" });

    const params = requestUrl(fetchMock).searchParams;
    expect(params.get("minAbv")).toBe("9");
    expect(params.get("maxAbv")).toBe("12");
  });
});

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";

const westvleteren12: BeerDetails = {
  id: beerId,
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  description: "Dark strong Trappist ale.",
  brewery: { id: "br1", name: "Brouwerij Westvleteren", countryCode: "BE", city: "Vleteren" },
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

const breweryId = "7f1c2a3b-0000-4000-8000-000000000001";
const request = { name: "Öö Bourbon", style: "Imperial Stout", abv: 12.5, breweryId };
const problem = (status: number, body: object) =>
  new Response(JSON.stringify({ status, ...body }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });

describe("addBeer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the beer and answers with the beer it created", async () => {
    const fetchMock = vi.fn(async () => Response.json(westvleteren12, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(addBeer(request)).resolves.toEqual({ kind: "added", beer: westvleteren12 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/beers");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it("names the beer a duplicate duplicates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => problem(409, { existingBeerId: beerId })));

    await expect(addBeer(request)).resolves.toEqual({ kind: "duplicateBeer", existingBeerId: beerId });
  });

  it("names the brewery a duplicate brewery duplicates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        problem(409, { existingBreweryId: breweryId, existingBreweryName: "Ruosniemen Panimo", existingBreweryCountryCode: "FI" }),
      ),
    );

    await expect(addBeer(request)).resolves.toEqual({ kind: "duplicateBrewery", existingBreweryId: breweryId });
  });

  it("lists every field a 400 refuses", async () => {
    const errors = [
      { field: "style", message: "must be one of the catalog's styles" },
      { field: "newBrewery.countryCode", message: "must be a listed country" },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => problem(400, { detail: "Validation failed", errors })));

    await expect(addBeer(request)).resolves.toEqual({ kind: "refused", fields: errors });
  });

  it("reports a 400 without field detail as a refusal of no field in particular", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => problem(400, { detail: "Malformed JSON" })));

    await expect(addBeer(request)).resolves.toEqual({ kind: "refused", fields: [] });
  });

  it("reports a brewery that has since gone as a refusal of the brewery", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => problem(404, { detail: "No brewery" })));

    await expect(addBeer(request)).resolves.toEqual({
      kind: "refused",
      fields: [{ field: "breweryId", message: "No brewery" }],
    });
  });

  it.each([401, 500])("throws a tagged http ApiError on a %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status })));

    await expect(addBeer(request)).rejects.toMatchObject({ name: "ApiError", kind: "http", status });
  });
});

describe("the add-a-beer form's reads", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds breweries by name, a few at a time", async () => {
    const brewery = { id: breweryId, name: "Põhjala", countryCode: "EE", city: "Tallinn" };
    const fetchMock = vi.fn(async () =>
      Response.json({ content: [brewery], totalElements: 1, totalPages: 1, page: 0 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(findBreweries("põh")).resolves.toEqual([brewery]);
    const url = requestUrl(fetchMock);
    expect(url.pathname).toBe("/api/v1/breweries");
    expect(url.searchParams.get("query")).toBe("põh");
    expect(url.searchParams.get("size")).toBe("8");
  });

  it("lists a brewery's beers by its id", async () => {
    const fetchMock = vi.fn(async () => Response.json(emptyPage));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listBreweryBeers(breweryId)).resolves.toEqual([]);
    const params = requestUrl(fetchMock).searchParams;
    expect(params.get("breweryId")).toBe(breweryId);
    expect(params.get("size")).toBe("100");
  });

  it("lists the styles and the countries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => Response.json(url.endsWith("/styles") ? ["IPA", "Porter"] : ["FI", "EE"])),
    );

    await expect(listStyles()).resolves.toEqual(["IPA", "Porter"]);
    await expect(listCountries()).resolves.toEqual(["FI", "EE"]);
  });

  it("throws a tagged http ApiError when a read fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

    await expect(listStyles()).rejects.toMatchObject({ kind: "http", status: 503 });
    await expect(listCountries()).rejects.toMatchObject({ kind: "http", status: 503 });
    await expect(findBreweries("x")).rejects.toMatchObject({ kind: "http", status: 503 });
    await expect(listBreweryBeers(breweryId)).rejects.toMatchObject({ kind: "http", status: 503 });
  });
});
