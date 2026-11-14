import { httpFailure } from "@kalia/api";
import { getBeer, listBreweries, listBreweryCountries, listStyles, searchBeers as generatedSearchBeers } from "@kalia/api/generated/catalog/catalog";
import type { BeerDetailsDto, BeerSummaryDto, BreweryDto, PageDtoBeerSummaryDto, PageDtoBreweryDto, SearchBeersParams } from "@kalia/api/generated/models";

export type BeerSummary = BeerSummaryDto;
export type BeerDetails = BeerDetailsDto;

export type BeerPage = PageDtoBeerSummaryDto;

export const BEER_PAGE_SIZE = 20;
export const MAX_RESULT_WINDOW = 10_000;

export const readBeerPage = async (params: SearchBeersParams, page: number): Promise<BeerPage> => {
  const response = await generatedSearchBeers({ ...params, page, size: BEER_PAGE_SIZE });
  if (response.status !== 200) {
    throw httpFailure("Beer search", response);
  }
  return response.data;
};

export type BreweryOption = BreweryDto;
export type BreweryPage = PageDtoBreweryDto;
export const BREWERY_PAGE_SIZE = 20;

export const readStyles = async (): Promise<string[]> => {
  const response = await listStyles();
  if (response.status !== 200) throw httpFailure("Styles", response);
  return response.data;
};

export const readBreweryCountries = async (): Promise<string[]> => {
  const response = await listBreweryCountries();
  if (response.status !== 200) throw httpFailure("Brewery countries", response);
  return response.data;
};

export const readBreweryPage = async (query: string, page: number): Promise<BreweryPage> => {
  const response = await listBreweries({ page, size: BREWERY_PAGE_SIZE, ...(query ? { query } : {}) });
  if (response.status !== 200) throw httpFailure("Brewery search", response);
  return response.data;
};

export const readResultCount = async (params: SearchBeersParams): Promise<number> => {
  const response = await generatedSearchBeers({ ...params, page: 0, size: 1 });
  if (response.status !== 200) throw httpFailure("Beer count", response);
  return response.data.totalElements;
};

const BEER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `null` is an answer, not a failure: a beer that is gone, withheld, someone else's pending one, or never there, and an id that cannot name one. */
export const readBeer = async (id: string): Promise<BeerDetails | null> => {
  if (!BEER_ID.test(id)) return null;
  const response = await getBeer(id, { answers: [404] });
  if (response.status === 404) return null;
  if (response.status !== 200) throw httpFailure("Beer details", response);
  return response.data;
};

export const SIMILAR_BEER_LIMIT = 5;

/** One more than shown is asked for, so leaving the beer itself out still fills the section. */
export const readSimilarBeers = async (style: string, exceptId: string): Promise<BeerSummary[]> => {
  const response = await generatedSearchBeers({ style, page: 0, size: SIMILAR_BEER_LIMIT + 1 });
  if (response.status !== 200) throw httpFailure("Similar beers", response);
  return response.data.content.filter((beer) => beer.id !== exceptId).slice(0, SIMILAR_BEER_LIMIT);
};
