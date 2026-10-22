import type { Locale } from "@/i18n/settings";

/** An ISO 3166-1 code named in `locale` from the runtime's own CLDR data (ADR-0079).
 *  Do not call it from a client component: Node and the browser can word a name
 *  differently, and the hydrated text would then disagree with the server's. */
export const countryName = (code: string, locale: Locale): string => {
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
};

/** Each code with its name in `locale`, in that language's alphabetical order. */
export const countriesByName = (codes: readonly string[], locale: Locale): { code: string; name: string }[] => {
  const collator = new Intl.Collator(locale);
  return codes
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name));
};
