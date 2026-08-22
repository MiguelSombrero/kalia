import type { Locale } from "@/i18n/settings";

const MS_PER_DAY = 86_400_000;

export const formatRelativeDate = (isoDate: string, locale: Locale, now: Date = new Date()): string => {
  // isoDate is a date-only string, parsed as UTC midnight — now must be
  // truncated to UTC midnight too, or the diff picks up the caller's
  // time-of-day and can round to the wrong day/month/year near a boundary.
  const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((new Date(isoDate).getTime() - nowUtcMidnight) / MS_PER_DAY);
  const absDays = Math.abs(diffDays);

  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absDays >= 365
      ? [Math.round(diffDays / 365), "year"]
      : absDays >= 30
        ? [Math.round(diffDays / 30), "month"]
        : [diffDays, "day"];

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
};
