import type { Locale } from "@/i18n/settings";

const withQuery = (path: string, query?: URLSearchParams): string => {
  const search = query?.toString();
  return search ? `${path}?${search}` : path;
};

export const homeHref = (locale: Locale): string => {
  return `/${locale}`;
};

export const profileHref = (locale: Locale): string => {
  return `/${locale}/profile`;
};

export type SignUpError = "agree-required" | "rate-limited";

export const signUpHref = (locale: Locale, error?: SignUpError): string => {
  return withQuery(`/${locale}/sign-up`, error ? new URLSearchParams({ error }) : undefined);
};

export const usernameTakenHref = (locale: Locale): string => {
  return `/${locale}/username-taken`;
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
export const cellarHref = (locale: Locale, username: string, page = 0): string => {
  const path = `/${locale}/cellars/${encodeURIComponent(username)}`;
  return page > 0 ? `${path}?page=${page}` : path;
};

/** The address offered for copying (ADR-0050). */
export const shareableCellarHref = (username: string): string => {
  return `/cellars/${encodeURIComponent(username)}`;
};
