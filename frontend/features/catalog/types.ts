// Re-exports of orval-generated types (from the backend's OpenAPI spec,
// ADR-0012) under this feature's existing names — the generated shapes
// are the source of truth; consumers of this module are unaffected.
export type {
  MoneyDto,
  BreweryRefDto as BreweryRef,
  BeerSummaryDto as BeerSummary,
  BreweryDto as Brewery,
  BeerDetailsDto as BeerDetails,
  PageDtoBeerSummaryDto as BeerPage,
} from "@/lib/api/generated/models";

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
