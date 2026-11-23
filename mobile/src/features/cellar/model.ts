import type { TranslationKey } from "@/lib/i18n/translationKey";

import type { CellarEntry } from "./types";

export const CELLAR_ORDERS = ["name", "style", "strength", "bottles", "bestBefore"] as const;
export type CellarOrder = (typeof CELLAR_ORDERS)[number];

export const ORDER_LABEL_KEYS: Record<CellarOrder, TranslationKey> = {
  name: "cellar.sort.name",
  style: "cellar.sort.style",
  strength: "cellar.sort.abv",
  bottles: "cellar.sort.bottles",
  bestBefore: "cellar.sort.bestBefore",
};

const soonestBestBefore = (entry: CellarEntry) =>
  entry.bottles
    .map((bottle) => bottle.bestBeforeDate)
    .filter((date): date is string => Boolean(date))
    .sort()[0];

const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const findEntries = (entries: CellarEntry[], text: string) => {
  const wanted = fold(text.trim());
  if (!wanted) return entries;
  return entries.filter((entry) => fold(entry.beer.name).includes(wanted) || fold(entry.beer.brewery).includes(wanted));
};

export const sortEntries = (entries: CellarEntry[], order: CellarOrder, locale: string) => {
  const text = (a: string, b: string) => a.localeCompare(b, locale, { sensitivity: "base" });
  const byName = (a: CellarEntry, b: CellarEntry) => text(a.beer.name, b.beer.name);
  const compare: Record<CellarOrder, (a: CellarEntry, b: CellarEntry) => number> = {
    name: byName,
    style: (a, b) => text(a.beer.style, b.beer.style) || byName(a, b),
    strength: (a, b) => b.beer.abv - a.beer.abv || byName(a, b),
    bottles: (a, b) => b.quantity - a.quantity || byName(a, b),
    bestBefore: (a, b) => {
      const [first, second] = [soonestBestBefore(a), soonestBestBefore(b)];
      if (first && second) return first.localeCompare(second) || byName(a, b);
      return (first ? -1 : second ? 1 : 0) || byName(a, b);
    },
  };
  return [...entries].sort(compare[order]);
};

export const totalsOf = (entries: CellarEntry[]) => ({ beers: entries.length, bottles: entries.reduce((sum, entry) => sum + entry.quantity, 0) });
