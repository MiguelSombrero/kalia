import { describe, expect, it } from "vitest";
import { cellarCounts } from "./cellarTotals";
import type { CellarBeer } from "./types";

const beer = (bottles: number) => ({ bottles: Array.from({ length: bottles }, () => ({})) }) as unknown as CellarBeer;

describe("cellarCounts", () => {
  it("counts beers and every bottle under them", () => {
    expect(cellarCounts([beer(3), beer(1), beer(2)])).toEqual({ beers: 3, bottles: 6 });
  });

  it("counts an empty cellar as zero of each", () => {
    expect(cellarCounts([])).toEqual({ beers: 0, bottles: 0 });
  });
});
