import { DEFAULT_SORT, emptyFilters, removeFilter, searchParams, sheetFilterCount, strengthError } from "./model";

describe("strengthError", () => {
  it.each([
    [{ min: "9", max: "5" }, "order"],
    [{ min: "5", max: "9" }, null],
    [{ min: "5", max: "5" }, null],
    [{ min: "", max: "9" }, null],
    [{ min: "9,5", max: "9.4" }, "order"],
    [{ min: "-1", max: "" }, "bound"],
    [{ min: "", max: "101" }, "bound"],
    [{ min: "abc", max: "" }, "bound"],
    [{ min: "1e1", max: "" }, "bound"],
    [{ min: "0x10", max: "" }, "bound"],
  ])("judges %j as %s", (range, error) => {
    expect(strengthError(range)).toBe(error);
  });
});

describe("searchParams", () => {
  it("sends only what is set, with a decimal comma read as a point", () => {
    expect(searchParams({ ...emptyFilters(), style: "IPA", min: "4,5", max: "", sort: "abv,desc" })).toEqual({ style: "IPA", minAbv: 4.5, sort: "abv,desc" });
  });

  it("bounds the text to the API's length", () => {
    expect(String(searchParams({ ...emptyFilters(), query: "x".repeat(300) }).query).length).toBe(100);
  });

  it("leaves a refused strength range out", () => {
    expect(searchParams({ ...emptyFilters(), min: "9", max: "5" })).toEqual({ sort: DEFAULT_SORT });
  });
});

describe("sheetFilterCount", () => {
  it("counts the style, brewery, country, strength and a sort other than the default, and not the query", () => {
    expect(sheetFilterCount({ ...emptyFilters(), query: "ipa" })).toBe(0);
    expect(sheetFilterCount({ ...emptyFilters(), style: "IPA", breweryId: "b", countryCode: "FI", min: "4", sort: "abv,desc" })).toBe(5);
  });
});

describe("removeFilter", () => {
  it("clears what a chip stands for and nothing else", () => {
    const all = { ...emptyFilters(), query: "q", style: "IPA", breweryId: "b", breweryName: "B", countryCode: "FI", min: "4", max: "7", sort: "abv,desc" as const };
    expect(removeFilter(all, "brewery")).toEqual({ ...all, breweryId: "", breweryName: "" });
    expect(removeFilter(all, "strength")).toEqual({ ...all, min: "", max: "" });
    expect(removeFilter(all, "sort").sort).toBe(DEFAULT_SORT);
    expect(removeFilter(all, "style").style).toBe("");
    expect(removeFilter(all, "country").countryCode).toBe("");
  });
});
