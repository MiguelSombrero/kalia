import type { Locale } from "@/i18n/settings";

const CONNECTOR: Record<Locale, string> = {
  en: "and",
  fi: "ja",
};

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

type CalendarSpan = { years: number; months: number; days: number };

// Calendar-exact year/month/day span between two UTC-midnight dates
// (order-independent) — the standard "age" decomposition. Bounds months to
// 0-11 and days to less than a month by construction, so the second unit
// below never needs its own overflow check.
const calendarSpan = (earlier: Date, later: Date): CalendarSpan => {
  let years = later.getUTCFullYear() - earlier.getUTCFullYear();
  let months = later.getUTCMonth() - earlier.getUTCMonth();
  let days = later.getUTCDate() - earlier.getUTCDate();

  if (days < 0) {
    months -= 1;
    days += daysInMonth(later.getUTCFullYear(), later.getUTCMonth() - 1);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
};

type UnitParts = { full: string; core: string; prefix: string };

// formatToParts() merges the unit word and the direction word ("ago" /
// "sitten") into one trailing literal for past-tense phrases (and Finnish
// future), or splits them into a leading direction literal + a bare unit
// word for English future ("in " + "years"). Either way the direction word
// sits on its own side of the single space next to the plain unit word, so
// isolating it needs no per-locale word list — only the connector above is
// authored per locale.
const formatUnit = (
  formatter: Intl.RelativeTimeFormat,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
): UnitParts => {
  const parts = formatter.formatToParts(value, unit);
  const full = parts.map((part) => part.value).join("");
  const [first, ...rest] = parts;

  if (first.type === "literal") {
    return { full, core: rest.map((part) => part.value).join(""), prefix: first.value };
  }

  const trailing = parts[parts.length - 1].value.trimStart();
  const unitWord = trailing.slice(0, trailing.indexOf(" "));
  return { full, core: `${first.value} ${unitWord}`, prefix: "" };
};

// numeric: "auto" special-cases magnitude 1 into a bare word with no integer
// part at all — formatToParts(-1, "year") is `[{type:"literal",value:"last
// year"}]`, formatToParts(-1, "day") is `[{type:"literal",value:"yesterday"}]`.
// formatUnit()'s core/prefix split needs the plain "1 year ago" shape, so
// two-unit composition always uses "always" regardless of the locale's
// idiomatic single-unit wording used elsewhere in this file.
const formatTwoUnit = (
  locale: Locale,
  value1: number,
  unit1: Intl.RelativeTimeFormatUnit,
  value2: number,
  unit2: Intl.RelativeTimeFormatUnit,
): string => {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  const first = formatUnit(formatter, value1, unit1);
  const second = formatUnit(formatter, value2, unit2);
  const connector = CONNECTOR[locale];

  return first.prefix
    ? `${first.prefix}${first.core} ${connector} ${second.core}`
    : `${first.core} ${connector} ${second.full}`;
};

export const formatRelativeDate = (isoDate: string, locale: Locale, now: Date = new Date()): string => {
  // isoDate is a date-only string, parsed as UTC midnight — now must be
  // truncated to UTC midnight too, or the diff picks up the caller's
  // time-of-day and can round to the wrong day/month/year near a boundary.
  const nowUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(isoDate);
  const isFuture = target.getTime() > nowUtcMidnight.getTime();
  const sign = isFuture ? 1 : -1;
  const [earlier, later] = isFuture ? [nowUtcMidnight, target] : [target, nowUtcMidnight];

  const { years, months, days } = calendarSpan(earlier, later);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (years > 0) {
    return months === 0
      ? formatter.format(sign * years, "year")
      : formatTwoUnit(locale, sign * years, "year", sign * months, "month");
  }
  if (months > 0) {
    return days === 0
      ? formatter.format(sign * months, "month")
      : formatTwoUnit(locale, sign * months, "month", sign * days, "day");
  }
  return formatter.format(sign * days, "day");
};
