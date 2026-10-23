import { SORT_OPTIONS, type BeerPage, type BeerSearchParams } from "./types";

// The search API's own bounds (CatalogController); a value past one is a 400.
export const MAX_ABV = 100;
export const MAX_FILTER_LENGTH = 100;
export const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 10_000;
const DEFAULT_PAGE_SIZE = 20;

const COUNTRY_CODE = /^[A-Z]{2}$/;
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;
const WHOLE_NUMBER = /^\d+$/;

const VALID_SORT_VALUES: ReadonlySet<string> = new Set(SORT_OPTIONS.map((option) => option.value));

type ParamKey = keyof BeerSearchParams;

export type NormalizedSearch = { params: BeerSearchParams; ignored: ParamKey[] };

const isText = (value: string): boolean => value.length <= MAX_FILTER_LENGTH;

const isAbv = (value: string): boolean => DECIMAL.test(value) && Number(value) <= MAX_ABV;

const isSize = (value: string): boolean => {
  if (!WHOLE_NUMBER.test(value)) {
    return false;
  }
  const size = Number(value);
  return size >= 1 && size <= MAX_PAGE_SIZE;
};

/** Whether the search API serves this zero-based page at this size. */
export const isReachablePage = (page: number, size: number | undefined): boolean => {
  return page <= lastReachablePage(size);
};

/** The last zero-based page the search API serves at this size. */
export const lastReachablePage = (size: number | undefined): number => {
  return Math.floor(MAX_OFFSET / (size ?? DEFAULT_PAGE_SIZE));
};

export const isPastLastPage = (result: BeerPage): boolean => {
  return result.totalElements > 0 && result.page >= result.totalPages;
};

const CHECKS: Record<ParamKey, (value: string, size: number | undefined) => boolean> = {
  query: isText,
  style: isText,
  countryCode: (value) => COUNTRY_CODE.test(value),
  minAbv: isAbv,
  maxAbv: isAbv,
  page: (value, size) => WHOLE_NUMBER.test(value) && isReachablePage(Number(value), size),
  size: isSize,
  sort: (value) => VALID_SORT_VALUES.has(value),
};

/** Drops each value the search API would refuse, and orders a reversed ABV range. */
export const normalizeBeerSearchParams = (raw: BeerSearchParams): NormalizedSearch => {
  const size = raw.size && isSize(raw.size) ? Number(raw.size) : undefined;
  const params: BeerSearchParams = {};
  const ignored: ParamKey[] = [];
  for (const key of Object.keys(CHECKS) as ParamKey[]) {
    const value = raw[key];
    if (!value) {
      continue;
    }
    if (CHECKS[key](value, size)) {
      params[key] = key === "minAbv" || key === "maxAbv" ? String(Number(value)) : value;
    } else {
      ignored.push(key);
    }
  }
  if (params.minAbv && params.maxAbv && Number(params.minAbv) > Number(params.maxAbv)) {
    [params.minAbv, params.maxAbv] = [params.maxAbv, params.minAbv];
  }
  return { params, ignored };
};
