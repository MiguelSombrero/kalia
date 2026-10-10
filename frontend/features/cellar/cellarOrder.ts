import type { Locale } from "@/i18n/settings";
import type { CellarBeer } from "./types";

export const cellarSorts = ["name", "style", "abv", "bottles", "bestBefore"] as const;

export type CellarSort = (typeof cellarSorts)[number];

export const defaultCellarSort: CellarSort = "name";

export const toCellarSort = (value: string | null | undefined): CellarSort =>
  cellarSorts.find((sort) => sort === value) ?? defaultCellarSort;

/** Date-only ISO strings, earliest first, a missing date last. */
const compareDates = (a?: string, b?: string): number => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
};

export const inVintageOrder = <T extends { brewedDate?: string }>(bottles: T[]): T[] =>
  [...bottles].sort((a, b) => compareDates(a.brewedDate, b.brewedDate));

const earliestBestBefore = (beer: CellarBeer): string | undefined =>
  beer.bottles
    .map((bottle) => bottle.bestBeforeDate)
    .filter((date): date is string => Boolean(date))
    .sort()[0];

export const sortCellar = (beers: CellarBeer[], sort: CellarSort, locale: Locale): CellarBeer[] => {
  const byName = (a: CellarBeer, b: CellarBeer) => a.beerName.localeCompare(b.beerName, locale);
  const compare: Record<CellarSort, (a: CellarBeer, b: CellarBeer) => number> = {
    name: byName,
    style: (a, b) => a.style.localeCompare(b.style, locale) || byName(a, b),
    abv: (a, b) => b.abv - a.abv || byName(a, b),
    bottles: (a, b) => b.bottles.length - a.bottles.length || byName(a, b),
    bestBefore: (a, b) => compareDates(earliestBestBefore(a), earliestBestBefore(b)) || byName(a, b),
  };
  return [...beers].sort(compare[sort]);
};
