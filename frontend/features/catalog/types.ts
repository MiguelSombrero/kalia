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

export interface Brewery {
  id: string;
  name: string;
  country: string;
  city: string | null;
}

export interface BeerDetails {
  id: string;
  name: string;
  style: string;
  abv: number;
  description: string | null;
  price: MoneyDto;
  brewery: Brewery;
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
