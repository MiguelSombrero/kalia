import type { Locale } from "@/i18n/settings";

const withQuery = (path: string, query?: URLSearchParams): string => {
  const search = query?.toString();
  return search ? `${path}?${search}` : path;
};

export const catalogHref = (locale: Locale, query?: URLSearchParams): string => {
  return withQuery(`/${locale}/beers`, query);
};

export const beerHref = (locale: Locale, beerId: string, query?: URLSearchParams): string => {
  return withQuery(`/${locale}/beers/${encodeURIComponent(beerId)}`, query);
};

export const ownCellarHref = (locale: Locale): string => {
  return `/${locale}/cellar`;
};

/** For links inside the app; a copied address is `shareableCellarHref` (ADR-0050). */
export const cellarHref = (locale: Locale, username: string): string => {
  return `/${locale}/cellars/${encodeURIComponent(username)}`;
};

/** The address offered for copying (ADR-0050). */
export const shareableCellarHref = (username: string): string => {
  return `/cellars/${encodeURIComponent(username)}`;
};
