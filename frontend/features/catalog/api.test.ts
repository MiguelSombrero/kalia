import { describe, expect, it } from "vitest";
import { buildBeerSearchParams } from "./api";

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
