import { headers } from "next/headers";
import { defaultLocale, isLocale, locales, type Locale } from "./settings";

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

/**
 * Recovers the current locale from the x-pathname header proxy.ts sets on
 * every locale-prefixed request. Special files (loading.tsx, not-found.tsx,
 * error boundaries) receive no route params from Next.js, so this is their
 * only way to know which locale they're rendering for. Previously
 * duplicated identically in three call sites (PR #43 review).
 */
export const resolveLocaleFromHeaders = async (): Promise<Locale> => {
  const requestHeaders = await headers();
  const pathnameLocale = requestHeaders.get("x-pathname")?.split("/")[1] ?? "";
  return isLocale(pathnameLocale) ? pathnameLocale : defaultLocale;
};
