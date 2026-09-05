import { apiError } from "@/lib/api/api-error";
import { getBeer, getBeersByIds } from "@/lib/api/generated/catalog/catalog";
import type { BeerSummaryDto } from "@/lib/api/generated/models";
import {
  addBottles as generatedAddBottles,
  listBottles as generatedListBottles,
  listEntries as generatedListEntries,
  removeBottle as generatedRemoveBottle,
  updateBottle as generatedUpdateBottle,
} from "@/lib/api/generated/cellar/cellar";
import { read as generatedReadPublicCellar } from "@/lib/api/generated/public-cellar/public-cellar";
import type {
  AddBottlesRequest,
  Bottle,
  CellarBeerRow,
  PublicCellar,
  PublicCellarBeer,
  UpdateBottleRequest,
} from "./types";

export const listCellarEntries = async (): Promise<CellarBeerRow[]> => {
  const response = await generatedListEntries();
  // Narrowed on `response.status` itself (a status literal per branch), not a
  // derived variable — that's what lets TS discriminate `response.data`.
  if (response.status !== 200) {
    throw apiError("http", `Cellar entries lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }

  const beersById = await fetchBeersById(response.data.map((entry) => entry.beerId));
  return response.data
    .map((entry) => toRow(entry, beersById.get(entry.beerId)))
    // A left join can hand back an entry every one of whose bottles has
    // since been removed — nothing to show for it.
    .filter((row): row is CellarBeerRow => row !== null && row.bottleCount > 0)
    .sort((a, b) => a.beerName.localeCompare(b.beerName));
};

// Matches the backend's CatalogController.MAX_BATCH_IDS (ADR-0042) — named
// once here so the two can't drift silently out of step.
const MAX_BATCH_IDS = 100;

// The batch endpoint omits an id it cannot resolve rather than answering null,
// so a beer no longer in the catalog is just absent from the map — a dropped
// row, not a transport failure (ADR-0023), handled in toRow.
const fetchBeersById = async (beerIds: string[]): Promise<Map<string, BeerSummaryDto>> => {
  const ids = [...new Set(beerIds)];
  if (ids.length === 0) {
    return new Map();
  }
  const chunks = chunk(ids, MAX_BATCH_IDS);
  const beers = await Promise.all(chunks.map(fetchBeerChunk));
  return new Map(beers.flat().map((beer) => [beer.id, beer]));
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchBeerChunk = async (ids: string[]): Promise<BeerSummaryDto[]> => {
  const response = await getBeersByIds({ ids });
  if (response.status !== 200) {
    throw apiError("http", `Batch beer lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

const toRow = (
  entry: { id: string; beerId: string; quantity: number },
  beer: BeerSummaryDto | undefined,
): CellarBeerRow | null => {
  if (!beer) {
    return null;
  }
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

// 404 — for an unknown username, a missing profile or a cellar that is not
// public alike — is "nothing to show here", not a transport failure (ADR-0023,
// ADR-0050): the caller renders the ordinary not-found page for it.
export const getPublicCellar = async (username: string): Promise<PublicCellar | null> => {
  const response = await generatedReadPublicCellar(username);
  // Widened via Number() so the 5xx branch below stays reachable: the
  // generated type is a 200|404 union and a literal check would narrow it away.
  const status = Number(response.status);
  if (response.status === 200) {
    return response.data;
  }
  if (status === 404) {
    return null;
  }
  throw apiError("http", `Public cellar lookup failed with status ${status}`, { status });
};

export const resolvePublicCellarBeers = async (
  cellar: PublicCellar,
): Promise<PublicCellarBeer[]> => {
  const rows = await Promise.all(cellar.entries.map(toPublicCellarBeer));
  return rows
    .filter((row): row is PublicCellarBeer => row !== null && row.bottles.length > 0)
    .sort((a, b) => a.beerName.localeCompare(b.beerName));
};

const toPublicCellarBeer = async (
  entry: PublicCellar["entries"][number],
): Promise<PublicCellarBeer | null> => {
  const beerResponse = await getBeer(entry.beerId);
  // Widened via Number() for the same reason as toRow above: the generated
  // getBeer type documents only a 200 branch.
  const beerStatus = Number(beerResponse.status);
  if (beerStatus === 404) {
    return null;
  }
  if (beerStatus !== 200) {
    throw apiError(
      "http",
      `Beer lookup for public cellar entry ${entry.id} failed with status ${beerStatus}`,
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
    bottles: [...entry.bottles].sort((a, b) => compareBrewedDate(a.brewedDate, b.brewedDate)),
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

export const updateCellarBottle = async (
  id: string,
  request: UpdateBottleRequest,
): Promise<Bottle> => {
  const response = await generatedUpdateBottle(id, request);
  if (response.status !== 200) {
    throw apiError("http", `Updating bottle ${id} failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

export const removeCellarBottle = async (id: string): Promise<void> => {
  const response = await generatedRemoveBottle(id);
  if (response.status !== 204) {
    throw apiError("http", `Removing bottle ${id} failed with status ${response.status}`, {
      status: response.status,
    });
  }
};

const compareBrewedDate = (a?: string, b?: string): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
};
