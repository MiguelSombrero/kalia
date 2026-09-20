// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type {
  BreweryRefDto as BreweryRef,
  BeerSummaryDto as BeerSummary,
  BreweryDto as Brewery,
  BeerDetailsDto as BeerDetails,
  PageDtoBeerSummaryDto as BeerPage,
} from "@/lib/api/generated/models";

/** URL search param values as they arrive from the page — all optional strings. */
export type BeerSearchParams = {
  query?: string;
  style?: string;
  country?: string;
  minAbv?: string;
  maxAbv?: string;
  page?: string;
  size?: string;
  sort?: string;
};

/** The `sort` values `SearchFilters` offers, and `api.ts` validates against. */
export const SORT_OPTIONS = [
  { value: "name,asc", labelKey: "catalog.filters.sortNameAsc" },
  { value: "name,desc", labelKey: "catalog.filters.sortNameDesc" },
  { value: "abv,asc", labelKey: "catalog.filters.sortAbvAsc" },
  { value: "abv,desc", labelKey: "catalog.filters.sortAbvDesc" },
  { value: "style,asc", labelKey: "catalog.filters.sortStyleAsc" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortValue = "name,asc";
