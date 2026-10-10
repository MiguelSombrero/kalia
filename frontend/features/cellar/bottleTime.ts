import type { Locale } from "@/i18n/settings";
import { formatRelativeDate } from "@/lib/relativeDate";

export const vintageOf = (bottle: { brewedDate?: string }): string | null =>
  bottle.brewedDate ? bottle.brewedDate.slice(0, 4) : null;

/** Strictly before `today`: a bottle on its best-before day is not past it. */
export const isPastBestBefore = (bottle: { bestBeforeDate?: string }, today: string): boolean =>
  bottle.bestBeforeDate !== undefined && bottle.bestBeforeDate < today;

// A date-only value parses as UTC midnight, so it is formatted in UTC: in the
// caller's own zone it would read as the day before anywhere west of UTC.
export const formatBottleDate = (isoDate: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(isoDate));

export const relativeToLocalDay = (isoDate: string, today: string, locale: Locale): string =>
  formatRelativeDate(isoDate, locale, new Date(`${today}T00:00:00Z`));
