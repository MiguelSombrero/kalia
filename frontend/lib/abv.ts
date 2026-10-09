import type { Locale } from "@/i18n/settings";

/** A strength as written in `locale`, kept on one line: "10.2 %", "10,2 %". */
export const formatAbv = (abv: number | string, locale: Locale): string => {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(abv));
  return `${number} %`;
};
