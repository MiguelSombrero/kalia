import { apiError } from "@/lib/api/api-error";
import {
  addBeer as generatedAddBeer,
  getBeer as generatedGetBeer,
  listBreweries as generatedListBreweries,
  listBreweryCountries as generatedListBreweryCountries,
  listCountries as generatedListCountries,
  listStyles as generatedListStyles,
  searchBeers as generatedSearchBeers,
} from "@/lib/api/generated/catalog/catalog";
import { MAX_PAGE_SIZE, normalizeBeerSearchParams } from "./searchParams";
import {
  type AddBeerRequest,
  type AddBeerResult,
  type BeerDetails,
  type BeerPage,
  type BeerSearchParams,
  type BeerSummary,
  type Brewery,
} from "./types";

export const searchBeers = async (search: BeerSearchParams): Promise<BeerPage> => {
  const { params } = normalizeBeerSearchParams(search);
  const response = await generatedSearchBeers({
    query: params.query,
    style: params.style,
    countryCode: params.countryCode,
    minAbv: params.minAbv ? Number(params.minAbv) : undefined,
    maxAbv: params.maxAbv ? Number(params.maxAbv) : undefined,
    page: params.page ? Number(params.page) : undefined,
    size: params.size ? Number(params.size) : undefined,
    sort: params.sort,
  });
  if (response.status !== 200) {
    throw apiError("http", `Beer search failed with status ${response.status}`, { status: response.status });
  }
  return response.data;
};

/** The ISO 3166-1 codes of the countries the catalog has breweries in, in no order. */
export const listBreweryCountries = async (): Promise<string[]> => {
  const response = await generatedListBreweryCountries();
  if (response.status !== 200) {
    throw apiError("http", `Brewery country list failed with status ${response.status}`, { status: response.status });
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
  if (response.status === 404) {
    return null;
  }
  if (response.status !== 200) {
    throw apiError("http", `Beer lookup failed with status ${response.status}`, { status: response.status });
  }
  return response.data;
};

/** A 401 or a 5xx is a failure to add, not an answer about the beer, and throws. */
export const addBeer = async (request: AddBeerRequest): Promise<AddBeerResult> => {
  const response = await generatedAddBeer(request);
  switch (response.status) {
    case 201:
      return { kind: "added", beer: response.data };
    case 400:
      return { kind: "refused", fields: "errors" in response.data ? response.data.errors : [] };
    case 404:
      return { kind: "refused", fields: [{ field: "breweryId", message: response.data.detail ?? "" }] };
    case 409:
      return "existingBeerId" in response.data
        ? { kind: "duplicateBeer", existingBeerId: response.data.existingBeerId }
        : { kind: "duplicateBrewery", existingBreweryId: response.data.existingBreweryId };
    default:
      throw apiError("http", `Adding a beer failed with status ${response.status}`, { status: response.status });
  }
};

const BREWERY_MATCHES = 8;

export const findBreweries = async (query: string): Promise<Brewery[]> => {
  const response = await generatedListBreweries({ query, size: BREWERY_MATCHES });
  if (response.status !== 200) {
    throw apiError("http", `Brewery search failed with status ${response.status}`, { status: response.status });
  }
  return response.data.content;
};

export const listBreweryBeers = async (breweryId: string): Promise<BeerSummary[]> => {
  const response = await generatedSearchBeers({ breweryId, size: MAX_PAGE_SIZE });
  if (response.status !== 200) {
    throw apiError("http", `Brewery beer list failed with status ${response.status}`, { status: response.status });
  }
  return response.data.content;
};

export const listStyles = async (): Promise<string[]> => {
  const response = await generatedListStyles();
  if (response.status !== 200) {
    throw apiError("http", `Style list failed with status ${response.status}`, { status: response.status });
  }
  return response.data;
};

/** The ISO 3166-1 codes a new brewery may be in, in no order. */
export const listCountries = async (): Promise<string[]> => {
  const response = await generatedListCountries();
  if (response.status !== 200) {
    throw apiError("http", `Country list failed with status ${response.status}`, { status: response.status });
  }
  return response.data;
};
