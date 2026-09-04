import type { PublicCellarBottleDto } from "@/lib/api/generated/models";

// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type {
  AddBottleRequestDto as AddBottlesRequest,
  BottleDto as Bottle,
  BottleDtoContainerType as ContainerType,
  PublicCellarDto as PublicCellar,
  PublicCellarBottleDto as PublicBottle,
  UpdateBottleRequestDto as UpdateBottleRequest,
} from "@/lib/api/generated/models";

// The value, not just the type: this file and api.ts are the only ones allowed
// to reach the generated client, so a feature that needs to enumerate the
// container types gets them from here rather than retyping the list.
export { BottleDtoContainerType as containerTypeValues } from "@/lib/api/generated/models";

/** One cellar entry merged with the catalog beer it points at. */
export type CellarBeerRow = {
  entryId: string;
  beerId: string;
  beerName: string;
  breweryName: string;
  style: string;
  abv: number;
  bottleCount: number;
};

/**
 * One public-cellar entry merged with the catalog beer it points at. Carries
 * the bottles inline — the public read returns them with the entry, unlike the
 * owner's cellar where a row lazy-loads its bottles on expand.
 */
export type PublicCellarBeer = {
  entryId: string;
  beerId: string;
  beerName: string;
  breweryName: string;
  style: string;
  abv: number;
  bottles: PublicCellarBottleDto[];
};
