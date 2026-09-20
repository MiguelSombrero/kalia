import { apiError } from "@/lib/api/api-error";
import {
  getBeer as generatedGetBeer,
  searchBeers as generatedSearchBeers,
} from "@/lib/api/generated/catalog/catalog";
import { DEFAULT_SORT, SORT_OPTIONS, type BeerDetails, type BeerPage, type BeerSearchParams } from "./types";

const PARAM_KEYS = [
  "query",
  "style",
  "country",
  "minAbv",
  "maxAbv",
  "page",
  "size",
  "sort",
] as const;

/** Builds the URL query string for shareable/pagination links — distinct
 *  from the typed params the generated client sends to the backend below. */
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

const VALID_SORT_VALUES: ReadonlySet<string> = new Set(SORT_OPTIONS.map((option) => option.value));

/** An out-of-set `sort` would otherwise reach the backend as a 400
 *  (`CatalogController.parseSort`). Do not default an absent `sort` too —
 *  leave it `undefined` so the backend's own default keeps applying. */
const normalizeSort = (sort: string | undefined): string | undefined => {
  if (!sort) {
    return undefined;
  }
  return VALID_SORT_VALUES.has(sort) ? sort : DEFAULT_SORT;
};

export const searchBeers = async (params: BeerSearchParams): Promise<BeerPage> => {
  const response = await generatedSearchBeers({
    query: params.query || undefined,
    style: params.style || undefined,
    country: params.country || undefined,
    minAbv: params.minAbv ? Number(params.minAbv) : undefined,
    maxAbv: params.maxAbv ? Number(params.maxAbv) : undefined,
    page: params.page ? Number(params.page) : undefined,
    size: params.size ? Number(params.size) : undefined,
    sort: normalizeSort(params.sort),
  });
  const status = Number(response.status);
  if (status !== 200) {
    throw apiError("http", `Beer search failed with status ${status}`, { status });
  }
  return response.data;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves to null when no beer exists for the id — including malformed ids
 *  from user-typed URLs, which the backend would reject with a 400. */
export const getBeer = async (id: string): Promise<BeerDetails | null> => {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }
  const response = await generatedGetBeer(id);
  const status = Number(response.status);
  if (status === 404) {
    return null;
  }
  if (status !== 200) {
    throw apiError("http", `Beer lookup failed with status ${status}`, { status });
  }
  return response.data;
};
