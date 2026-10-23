import type { Locale } from "@/i18n/settings";
import type { BeerSearchParams } from "./types";

export const PARAM_KEYS = [
  "query",
  "style",
  "countryCode",
  "minAbv",
  "maxAbv",
  "page",
  "size",
  "sort",
] as const;

/** Builds the URL query string for shareable/pagination links — distinct
 *  from the typed params api.ts sends to the backend. Kept out of api.ts so a
 *  client component can build a link without bundling the API client. */
export const buildBeerSearchParams = (params: BeerSearchParams): URLSearchParams => {
  const searchParams = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = params[key];
    if (value) {
      searchParams.set(key, value);
    }
  }
  return searchParams;
};

const withQuery = (path: string, params: BeerSearchParams): string => {
  const query = buildBeerSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
};

export const catalogHref = (locale: Locale, params: BeerSearchParams = {}): string => {
  return withQuery(`/${locale}/beers`, params);
};

/** A beer's page, carrying the search that led to it so the page can link
 *  back to that same search (ADR-0069). */
export const beerHref = (locale: Locale, beerId: string, search: BeerSearchParams = {}): string => {
  return withQuery(`/${locale}/beers/${beerId}`, search);
};

export const hasSearch = (params: BeerSearchParams): boolean => {
  return buildBeerSearchParams(params).size > 0;
};

/** Whether anything narrows the results; sort and page only reorder them. */
export const hasFilters = (params: BeerSearchParams): boolean => {
  return [params.query, params.style, params.countryCode, params.minAbv, params.maxAbv].some(Boolean);
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

/** A route's raw search params as the catalog's own, first value of each. */
export const parseBeerSearchParams = (raw: RawSearchParams): BeerSearchParams => {
  return {
    query: first(raw.query),
    style: first(raw.style),
    countryCode: first(raw.countryCode),
    minAbv: first(raw.minAbv),
    maxAbv: first(raw.maxAbv),
    page: first(raw.page),
    size: first(raw.size),
    sort: first(raw.sort),
  };
};
