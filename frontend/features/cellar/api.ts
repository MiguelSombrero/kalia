import { apiError } from "@/lib/api/api-error";
import { getBeer } from "@/lib/api/generated/catalog/catalog";
import {
  addBottles as generatedAddBottles,
  listBottles as generatedListBottles,
  listEntries as generatedListEntries,
} from "@/lib/api/generated/cellar/cellar";
import type { AddBottlesRequest, Bottle, CellarBeerRow } from "./types";

export const listCellarEntries = async (): Promise<CellarBeerRow[]> => {
  const response = await generatedListEntries();
  // Narrowed on `response.status` itself (a status literal per branch), not a
  // derived variable — that's what lets TS discriminate `response.data`.
  if (response.status !== 200) {
    throw apiError("http", `Cellar entries lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }

  const rows = await Promise.all(response.data.map(toRow));
  return rows
    .filter((row): row is CellarBeerRow => row !== null)
    .sort((a, b) => a.beerName.localeCompare(b.beerName));
};

// A 404 here means the entry's beer no longer exists in the catalog — domain
// data, not a transport failure (ADR-0023), so the row is dropped rather than
// failing the whole list, mirroring features/catalog/api.ts's getBeer.
const toRow = async (entry: {
  id: string;
  beerId: string;
  quantity: number;
}): Promise<CellarBeerRow | null> => {
  const beerResponse = await getBeer(entry.beerId);
  // Widened via Number(): the generated type has only a 200 branch (no
  // documented error response), so a literal comparison to 404 would not
  // compile — matches features/catalog/api.ts's own workaround for this gap.
  const beerStatus = Number(beerResponse.status);
  if (beerStatus === 404) {
    return null;
  }
  if (beerStatus !== 200) {
    throw apiError(
      "http",
      `Beer lookup for cellar entry ${entry.id} failed with status ${beerStatus}`,
      { status: beerStatus },
    );
  }
  const beer = beerResponse.data;
  return {
    entryId: entry.id,
    beerId: entry.beerId,
    beerName: beer.name,
    breweryName: beer.brewery.name,
    style: beer.style,
    abv: beer.abv,
    bottleCount: entry.quantity,
  };
};

export const listCellarBottles = async (entryId: string): Promise<Bottle[]> => {
  const response = await generatedListBottles(entryId);
  if (response.status !== 200) {
    throw apiError(
      "http",
      `Bottle lookup for cellar entry ${entryId} failed with status ${response.status}`,
      { status: response.status },
    );
  }
  return [...response.data].sort((a, b) => compareBrewedDate(a.brewedDate, b.brewedDate));
};

export const addBottlesToCellar = async (request: AddBottlesRequest): Promise<Bottle[]> => {
  const response = await generatedAddBottles(request);
  if (response.status !== 201) {
    throw apiError("http", `Adding bottles failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

const compareBrewedDate = (a?: string, b?: string): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
};
