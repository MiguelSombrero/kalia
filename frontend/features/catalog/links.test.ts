import { describe, expect, it } from "vitest";
import { beerHref, catalogHref, hasFilters, hasSearch } from "./links";

describe("catalog links", () => {
  it("keeps every search parameter, page included, on the beer's own URL", () => {
    expect(beerHref("en", "b1", { country: "Belgium", minAbv: "8", sort: "abv,desc", page: "1" })).toBe(
      "/en/beers/b1?country=Belgium&minAbv=8&page=1&sort=abv%2Cdesc",
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
