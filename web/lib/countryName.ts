import type { Locale } from "@/i18n/settings";

const regionNames = (locale: Locale) => new Intl.DisplayNames([locale], { type: "region" });

/** An ISO 3166-1 code named in `locale` from the runtime's own CLDR data (ADR-0079).
 *  Do not call it from a client component: Node and the browser can word a name
 *  differently, and the hydrated text would then disagree with the server's. */
export const countryName = (code: string, locale: Locale): string => {
  return regionNames(locale).of(code) ?? code;
};
