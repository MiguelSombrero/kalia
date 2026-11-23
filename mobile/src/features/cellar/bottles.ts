import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "@kalia/api";

import type { TranslationKey } from "@/lib/i18n/translationKey";

import type { Bottle } from "./types";

type Dated = { brewedDate?: string | null; bestBeforeDate?: string | null };

export const vintageOf = (bottle: Dated): string | null => (bottle.brewedDate ? bottle.brewedDate.slice(0, 4) : null);

/** Strictly before `today`: a bottle on its best-before day is not past it, as on the web. */
export const isPastBestBefore = (bottle: Dated, today: string): boolean => Boolean(bottle.bestBeforeDate) && (bottle.bestBeforeDate as string) < today;

/** The calendar day on the phone, as the `YYYY-MM-DD` a bottle's dates are written in. */
export const localToday = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// A date is a day with no time zone: a date-only value parses as UTC midnight, so it is formatted in UTC, or anywhere west of it would read the day before.
export const formatBottleDate = (isoDate: string, language: string): string => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" }).format(date);
};

const compareDates = (a?: string | null, b?: string | null): number => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
};

/** Oldest brew first, as on the web; a bottle with no brewed date last, and the earlier best-before date first among equals. */
export const inVintageOrder = (bottles: Bottle[]): Bottle[] =>
  [...bottles].sort((a, b) => compareDates(a.brewedDate, b.brewedDate) || compareDates(a.bestBeforeDate, b.bestBeforeDate));

export const containerLabelKey = enumLookup<Bottle["containerType"], TranslationKey>(
  { BOTTLE: "cellar.bottle.container.BOTTLE", CAN: "cellar.bottle.container.CAN", KEG: "cellar.bottle.container.KEG" },
  UNKNOWN_VALUE_LABEL_KEY,
);
