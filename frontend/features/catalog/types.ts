export interface MoneyDto {
  cents: number;
  currency: string;
}

export interface BreweryRef {
  id: string;
  name: string;
}

export interface BeerSummary {
  id: string;
  name: string;
  style: string;
  abv: number;
  price: MoneyDto;
  brewery: BreweryRef;
}

export interface BeerPage {
  content: BeerSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
}

/** URL search param values as they arrive from the page — all optional strings. */
export interface BeerSearchParams {
  query?: string;
  style?: string;
  country?: string;
  minAbv?: string;
  maxAbv?: string;
  page?: string;
  size?: string;
  sort?: string;
}
