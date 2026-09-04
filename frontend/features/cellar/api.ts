import { apiError } from "@/lib/api/api-error";
import { getBeer } from "@/lib/api/generated/catalog/catalog";
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

  const rows = await Promise.all(response.data.map(toRow));
  return rows
    // A left join can hand back an entry every one of whose bottles has
    // since been removed — nothing to show for it.
    .filter((row): row is CellarBeerRow => row !== null && row.bottleCount > 0)
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
