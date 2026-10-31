import type { BottleDto } from "@kalia/api/generated/models";

// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type {
  AddBottleRequestDto as AddBottlesRequest,
  BottleDto as Bottle,
  BottleDtoContainerType as ContainerType,
  UpdateBottleRequestDto as UpdateBottleRequest,
} from "@kalia/api/generated/models";

// The value, not just the type: this file and api.ts are the only ones allowed
// to reach the generated client, so a feature that needs to enumerate the
// container types gets them from here rather than retyping the list.
export { BottleDtoContainerType as containerTypeValues } from "@kalia/api/generated/models";

/**
 * One cellar entry with the beer the backend joined to it, its bottles in
 * vintage order. The owner's cellar and a public cellar share it.
 */
export type CellarBeer = {
  entryId: string;
  beerId: string;
  beerName: string;
  breweryName: string;
  style: string;
  abv: number;
  /** A public cellar's bottles are its own DTO, field-for-field alike (ADR-0050). */
  bottles: BottleDto[];
  /** Bottles held beyond those listed, set only when a public read capped the list. */
  unlistedBottles?: number;
};

/** One page of a public cellar, with what the whole cellar holds. */
export type PublicCellar = {
  username: string;
  beers: CellarBeer[];
  page: number;
  totalPages: number;
  totalBeers: number;
  totalBottles: number;
  lastBottleAddedAt?: string;
};
