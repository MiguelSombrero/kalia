import { describe, expect, it } from "vitest";
import { beerHref, buildBeerSearchParams, catalogHref, hasFilters, hasSearch } from "./links";

describe("buildBeerSearchParams", () => {
  it("omits missing and empty values", () => {
    const params = buildBeerSearchParams({ query: "", style: undefined });

    expect(params.toString()).toBe("");
  });

  it("includes provided filters", () => {
    const params = buildBeerSearchParams({
      query: "westvleteren",
      style: "Quadrupel",
      countryCode: "BE",
      minAbv: "9",
      maxAbv: "12",
      page: "1",
      size: "10",
      sort: "abv,desc",
    });

    expect(params.get("query")).toBe("westvleteren");
    expect(params.get("style")).toBe("Quadrupel");
    expect(params.get("countryCode")).toBe("BE");
    expect(params.get("minAbv")).toBe("9");
    expect(params.get("maxAbv")).toBe("12");
    expect(params.get("page")).toBe("1");
    expect(params.get("size")).toBe("10");
    expect(params.get("sort")).toBe("abv,desc");
  });
});

describe("catalog links", () => {
  it("keeps every search parameter, page included, on the beer's own URL", () => {
    expect(beerHref("en", "b1", { countryCode: "BE", minAbv: "8", sort: "abv,desc", page: "1" })).toBe(
      "/en/beers/b1?countryCode=BE&minAbv=8&page=1&sort=abv%2Cdesc",
    );
  });

  it("leaves the URL bare when there is no search to carry", () => {
    expect(beerHref("fi", "b1")).toBe("/fi/beers/b1");
    expect(catalogHref("fi", { query: "" })).toBe("/fi/beers");
    expect(hasSearch({ query: "" })).toBe(false);
    expect(hasSearch({ page: "2" })).toBe(true);
  });

  it("counts only what narrows the results as a filter, not sort or page", () => {
    expect(hasFilters({ sort: "name,asc", page: "1", query: "" })).toBe(false);
    expect(hasFilters({ maxAbv: "6" })).toBe(true);
  });
});
