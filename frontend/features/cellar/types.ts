// Re-exports of orval-generated types (ADR-0012) under this feature's names.
export type { BottleDto as Bottle, BottleDtoContainerType as ContainerType } from "@/lib/api/generated/models";

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
