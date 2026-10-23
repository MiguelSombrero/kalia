import { describe, expect, it } from "vitest";
import { isReachablePage, normalizeBeerSearchParams } from "./searchParams";

describe("normalizeBeerSearchParams", () => {
  it("keeps every value the search API accepts, unchanged", () => {
    const params = {
      query: "ipa",
      style: "IPA",
      countryCode: "FI",
      minAbv: "4.5",
      maxAbv: "100",
      page: "2",
      size: "100",
      sort: "abv,desc",
    };

    expect(normalizeBeerSearchParams(params)).toEqual({ params, ignored: [] });
  });

  it("leaves absent and empty values out without calling them ignored", () => {
    expect(normalizeBeerSearchParams({ query: "", minAbv: "", page: undefined })).toEqual({
      params: {},
      ignored: [],
    });
  });

  it.each([
    ["query", "a".repeat(101)],
    ["style", "s".repeat(101)],
    ["countryCode", "fi"],
    ["countryCode", "FIN"],
    ["minAbv", "100.1"],
    ["minAbv", "-1"],
    ["maxAbv", "strong"],
    ["maxAbv", "1e2"],
    ["maxAbv", "0x10"],
    ["page", "two"],
    ["page", "-1"],
    ["page", "1.5"],
    ["size", "0"],
    ["size", "101"],
    ["size", "ten"],
    ["sort", "price,desc"],
    ["sort", "abv,asc,extra"],
  ] as const)("drops %s=%s and names it ignored", (key, value) => {
    expect(normalizeBeerSearchParams({ query: "ipa", [key]: value })).toEqual({
      params: key === "query" ? {} : { query: "ipa" },
      ignored: [key],
    });
  });

  it("keeps a query of exactly the API's maximum length", () => {
    const query = "a".repeat(100);

    expect(normalizeBeerSearchParams({ query }).params).toEqual({ query });
  });

  it("swaps a minimum ABV above the maximum, without calling either ignored", () => {
    expect(normalizeBeerSearchParams({ minAbv: "12", maxAbv: "9.5" })).toEqual({
      params: { minAbv: "9.5", maxAbv: "12" },
      ignored: [],
    });
  });

  it("drops a page whose offset passes 10,000 rows at the API's default size of 20", () => {
    expect(normalizeBeerSearchParams({ page: "500" }).params).toEqual({ page: "500" });
    expect(normalizeBeerSearchParams({ page: "501" })).toEqual({ params: {}, ignored: ["page"] });
  });

  it("measures the page's offset at the size the search asks for", () => {
    expect(normalizeBeerSearchParams({ page: "100", size: "100" }).params).toEqual({ page: "100", size: "100" });
    expect(normalizeBeerSearchParams({ page: "101", size: "100" })).toEqual({
      params: { size: "100" },
      ignored: ["page"],
    });
  });

  it("measures the offset at the default size when the size itself is dropped", () => {
    expect(normalizeBeerSearchParams({ page: "400", size: "1000" })).toEqual({
      params: { page: "400" },
      ignored: ["size"],
    });
  });
});

describe("isReachablePage", () => {
  it("allows an offset of exactly 10,000 rows and no more", () => {
    expect(isReachablePage(500, undefined)).toBe(true);
    expect(isReachablePage(501, undefined)).toBe(false);
    expect(isReachablePage(10_000, 1)).toBe(true);
    expect(isReachablePage(10_001, 1)).toBe(false);
  });
});
