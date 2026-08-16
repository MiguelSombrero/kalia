import { headers } from "next/headers";
import { defaultLocale, isLocale, locales, type Locale } from "./settings";

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

// Recovers the locale from the x-pathname header proxy.ts sets — special
// files (loading.tsx, error boundaries) get no route params otherwise.
export const resolveLocaleFromHeaders = async (): Promise<Locale> => {
  const requestHeaders = await headers();
  const pathnameLocale = requestHeaders.get("x-pathname")?.split("/")[1] ?? "";
  return isLocale(pathnameLocale) ? pathnameLocale : defaultLocale;
};
