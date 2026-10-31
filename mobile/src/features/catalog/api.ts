import { apiError } from "@kalia/api";
import { searchBeers as generatedSearchBeers } from "@kalia/api/generated/catalog/catalog";
import type { BeerSummaryDto } from "@kalia/api/generated/models";

export type BeerSummary = BeerSummaryDto;

export const FIRST_PAGE_SIZE = 20;

export const readFirstBeerPage = async (): Promise<BeerSummary[]> => {
  const response = await generatedSearchBeers({ page: 0, size: FIRST_PAGE_SIZE });
  if (response.status !== 200) {
    throw apiError("http", `Beer search failed with status ${response.status}`, { status: response.status });
  }
  return response.data.content;
};
