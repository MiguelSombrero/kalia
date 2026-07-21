import { defaultLocale, locales, type Locale } from "./settings";

/**
 * Picks the best supported locale from an Accept-Language header, in
 * weighted preference order. Extracted from proxy.ts so the parsing logic
 * is unit-testable without a NextRequest.
 */
export const resolveLocaleFromAcceptLanguage = (header: string | null): Locale => {
  if (!header) {
    return defaultLocale;
  }

  const preferredTags = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter((tag): tag is string => Boolean(tag));

  for (const tag of preferredTags) {
    const primarySubtag = tag.split("-")[0];
    const match = locales.find((locale) => locale === primarySubtag);
    if (match) {
      return match;
    }
  }

  return defaultLocale;
};
