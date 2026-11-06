import type { Locale } from "@/i18n/settings";
import { countryName } from "@/lib/countryName";

export { countryName };

const regionNames = (locale: Locale) => new Intl.DisplayNames([locale], { type: "region" });

/** Each code with its name in `locale`, in that language's alphabetical order. */
export const countriesByName = (codes: readonly string[], locale: Locale): { code: string; name: string }[] => {
  const names = regionNames(locale);
  const collator = new Intl.Collator(locale);
  return codes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => collator.compare(a.name, b.name));
};
