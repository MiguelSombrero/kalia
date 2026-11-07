import { apiError } from "@kalia/api";
import {
  addBeer as generatedAddBeer,
  getBeer as generatedGetBeer,
  listBreweries as generatedListBreweries,
  listBreweryCountries as generatedListBreweryCountries,
  listCountries as generatedListCountries,
  listStyles as generatedListStyles,
  searchBeers as generatedSearchBeers,
} from "@kalia/api/generated/catalog/catalog";
import { remove as generatedRemoveBeer } from "@kalia/api/generated/admin-beers/admin-beers";
import { normalizeBeerSearchParams } from "./searchParams";
import {
  type AddBeerRequest,
  type AddBeerResult,
  type BeerDetails,
  type BeerPage,
  type BeerRemovalResult,
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
      if ("existingBeerId" in response.data) {
        return { kind: "duplicateBeer", existingBeerId: response.data.existingBeerId };
      }
      if ("existingBreweryId" in response.data) {
        return {
          kind: "duplicateBrewery",
          existing: {
            id: response.data.existingBreweryId,
            name: response.data.existingBreweryName,
            countryCode: response.data.existingBreweryCountryCode,
          },
        };
      }
      return { kind: "pendingElsewhere", subject: response.data.subject === "BREWERY" ? "brewery" : "beer" };
    case 429:
      return { kind: "pendingCap" };
    default:
      throw apiError("http", `Adding a beer failed with status ${response.status}`, { status: response.status });
  }
};

/** 403, 404 and 409 are answers; anything else that is not a 200 throws. */
export const removeBeer = async (id: string): Promise<BeerRemovalResult> => {
  const response = await generatedRemoveBeer(id);
  switch (response.status) {
    case 200:
      return { kind: "removed" };
    case 403:
    case 404:
    case 409:
      return { kind: "refused", status: response.status };
    default:
      throw apiError("http", `Removing a beer failed with status ${response.status}`, { status: response.status });
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

const SIMILAR_BEERS = 5;

// The API's bound on a search term (CatalogController.MAX_FILTER_LENGTH).
const MAX_NAME_LENGTH = 100;

/** The brewery's beers whose name contains a word of `name` (ADR-0082), as many as the hint shows. */
export const findSimilarBeers = async (breweryId: string, name: string): Promise<BeerSummary[]> => {
  const response = await generatedSearchBeers({
    breweryId,
    similarTo: name.slice(0, MAX_NAME_LENGTH),
    size: SIMILAR_BEERS,
  });
  if (response.status !== 200) {
    throw apiError("http", `Similar beer search failed with status ${response.status}`, { status: response.status });
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
