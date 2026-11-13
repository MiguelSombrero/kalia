import { httpFailure } from "@kalia/api";
import { listBreweries, listBreweryCountries, listStyles, searchBeers as generatedSearchBeers } from "@kalia/api/generated/catalog/catalog";
import type { BeerSummaryDto, BreweryDto, PageDtoBreweryDto, SearchBeersParams } from "@kalia/api/generated/models";

export type BeerSummary = BeerSummaryDto;

export const FIRST_PAGE_SIZE = 20;

export const readFirstBeerPage = async (): Promise<BeerSummary[]> => {
  const response = await generatedSearchBeers({ page: 0, size: FIRST_PAGE_SIZE });
  if (response.status !== 200) {
    throw httpFailure("Beer search", response);
  }
  return response.data.content;
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
