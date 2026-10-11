import type { CellarBeer } from "./types";

export type CellarTotals = { beers: number; bottles: number };

export const cellarCounts = (beers: CellarBeer[]): CellarTotals => ({
  beers: beers.length,
  bottles: beers.reduce((sum, beer) => sum + beer.bottles.length, 0),
});
