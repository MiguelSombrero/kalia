import { httpFailure } from "@kalia/api";
import { listBreweries, listBreweryCountries, listStyles, searchBeers as generatedSearchBeers } from "@kalia/api/generated/catalog/catalog";
import type { BeerSummaryDto, BreweryDto, PageDtoBeerSummaryDto, PageDtoBreweryDto, SearchBeersParams } from "@kalia/api/generated/models";

export type BeerSummary = BeerSummaryDto;

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
