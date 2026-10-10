import { describe, expect, it } from "vitest";
import { inVintageOrder, sortCellar, toCellarSort } from "./cellarOrder";
import type { Bottle, CellarBeer } from "./types";

const bottle = (id: string, dates: { brewedDate?: string; bestBeforeDate?: string } = {}): Bottle => ({
  id,
  entryId: "e",
  containerType: "BOTTLE",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...dates,
});

const beer = (beerName: string, overrides: Partial<CellarBeer>): CellarBeer => ({
  entryId: beerName,
  beerId: beerName,
  beerName,
  breweryName: "Brewery",
  style: "IPA",
  abv: 6,
  bottles: [bottle(`${beerName}-1`)],
  ...overrides,
});

const orval = beer("Orval", { style: "Belgian Pale Ale", abv: 6.2, bottles: [bottle("o1"), bottle("o2", { bestBeforeDate: "2031-03-12" })] });
const westvleteren = beer("Westvleteren 12", { style: "Quadrupel", abv: 10.2, bottles: [bottle("w1", { bestBeforeDate: "2026-10-09" }), bottle("w2"), bottle("w3")] });
const savuGose = beer("Savu Gose", { style: "Gose", abv: 4.2, bottles: [bottle("s1", { bestBeforeDate: "2026-08-01" })] });
const undated = beer("Amarillo IPA", { style: "IPA", abv: 6.2 });
const cellar = [westvleteren, undated, savuGose, orval];

const names = (beers: CellarBeer[]) => beers.map((b) => b.beerName);

describe("sortCellar", () => {
  it("orders by name by default", () => {
    expect(names(sortCellar(cellar, "name", "en"))).toEqual(["Amarillo IPA", "Orval", "Savu Gose", "Westvleteren 12"]);
  });

  it("orders by style, then name", () => {
    expect(names(sortCellar(cellar, "style", "en"))).toEqual(["Orval", "Savu Gose", "Amarillo IPA", "Westvleteren 12"]);
  });

  it("orders by strength, strongest first, a tie broken by name", () => {
    expect(names(sortCellar(cellar, "abv", "en"))).toEqual(["Westvleteren 12", "Amarillo IPA", "Orval", "Savu Gose"]);
  });

  it("orders by bottle count, most first", () => {
    expect(names(sortCellar(cellar, "bottles", "en"))).toEqual(["Westvleteren 12", "Orval", "Amarillo IPA", "Savu Gose"]);
  });

  it("orders by each beer's soonest best-before, a beer with none last", () => {
    expect(names(sortCellar(cellar, "bestBefore", "en"))).toEqual(["Savu Gose", "Westvleteren 12", "Orval", "Amarillo IPA"]);
  });

  it("leaves the array it was given untouched", () => {
    const given = [...cellar];
    sortCellar(given, "abv", "en");
    expect(given).toEqual(cellar);
  });
});

describe("toCellarSort", () => {
  it("accepts every known sort", () => {
    expect(["name", "style", "abv", "bottles", "bestBefore"].map(toCellarSort)).toEqual(["name", "style", "abv", "bottles", "bestBefore"]);
  });

  it("falls back to name for anything else in the URL", () => {
    expect(toCellarSort("price")).toBe("name");
    expect(toCellarSort(null)).toBe("name");
  });
});

describe("inVintageOrder", () => {
  it("puts the oldest brewed date first and an undated bottle last", () => {
    const sorted = inVintageOrder([
      bottle("2025", { brewedDate: "2025-05-14" }),
      bottle("none"),
      bottle("2021", { brewedDate: "2021-10-04" }),
    ]);
    expect(sorted.map((b) => b.id)).toEqual(["2021", "2025", "none"]);
  });
});
