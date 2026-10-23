import type { BeerDetailsDto } from "@/lib/api/generated/models";

// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type {
  BreweryRefDto as BreweryRef,
  BeerSummaryDto as BeerSummary,
  BreweryDto as Brewery,
  BeerDetailsDto as BeerDetails,
  PageDtoBeerSummaryDto as BeerPage,
  AddBeerRequestDto as AddBeerRequest,
} from "@/lib/api/generated/models";

/** A field the server refused, named by its path in the request (`newBrewery.countryCode`). */
export type FieldRefusal = { field: string; message: string };

/** What `POST /api/v1/beers` answered, short of a failure to answer at all. */
export type AddBeerResult =
  | { kind: "added"; beer: BeerDetailsDto }
  | { kind: "duplicateBeer"; existingBeerId: string }
  | { kind: "duplicateBrewery"; existingBreweryId: string }
  | { kind: "refused"; fields: FieldRefusal[] };

/** A brewery as the add-a-beer form offers it, its place already named in the reader's language. */
export type BreweryOption = { id: string; name: string; place: string };

/** What the add-a-beer form needs before it can be filled in. */
export type AddBeerOptions = { styles: string[]; countries: { code: string; name: string }[] };

/** `AddBeerResult` as the form shows it: a duplicate carries what it duplicates. */
export type AddBeerOutcome =
  | { kind: "added"; beer: { id: string; name: string } }
  | { kind: "duplicateBeer"; existing: { id: string; name: string; breweryName: string } }
  | { kind: "duplicateBrewery"; existing: BreweryOption }
  | { kind: "refused"; fields: FieldRefusal[] };

/** URL search param values as they arrive from the page — all optional strings. */
export type BeerSearchParams = {
  query?: string;
  style?: string;
  countryCode?: string;
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
