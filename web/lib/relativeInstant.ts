import type { Locale } from "@/i18n/settings";

const JUST_NOW: Record<Locale, string> = {
  en: "just now",
  fi: "juuri nyt",
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export type RelativeInstant = { text: string; datetime: string };

// Do not give `now` a default. A caller that computes it independently
// (`new Date()`) at each render — server vs. hydration, or once per line in
// a list — reads a different instant each time, and the text diverges
// silently: a hydration warning and a flicker, never a failing test. Every
// caller must compute `now` once and thread that same value through.
export const formatRelativeInstant = (instant: string, locale: Locale, now: Date): RelativeInstant => {
  const target = new Date(instant);
  // Clamped rather than left negative: clock skew between the machine that
  // stamped the event and the one rendering it can put `target` a moment
  // after `now`, and "just now" is the right read for that skew rather than
  // a value that silently falls through every bucket below.
  const elapsed = Math.max(0, now.getTime() - target.getTime());
  const datetime = target.toISOString();

  if (elapsed < MINUTE) {
    return { text: JUST_NOW[locale], datetime };
  }

  const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (elapsed < HOUR) {
    return { text: relativeFormatter.format(-Math.floor(elapsed / MINUTE), "minute"), datetime };
  }
  if (elapsed < DAY) {
    return { text: relativeFormatter.format(-Math.floor(elapsed / HOUR), "hour"), datetime };
  }
  if (elapsed < WEEK) {
    return { text: relativeFormatter.format(-Math.floor(elapsed / DAY), "day"), datetime };
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return { text: dateFormatter.format(target), datetime };
};
