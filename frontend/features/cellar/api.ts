import { apiError, isApiError } from "@/lib/api/api-error";
import { logger } from "@/lib/logger";
import {
  addBottles as generatedAddBottles,
  listEntries as generatedListEntries,
  removeBottle as generatedRemoveBottle,
  updateBottle as generatedUpdateBottle,
} from "@/lib/api/generated/cellar/cellar";
import type { EntryDto, PublicCellarEntryDto } from "@/lib/api/generated/models";
import { read as generatedReadPublicCellar } from "@/lib/api/generated/public-cellar/public-cellar";
import { inVintageOrder } from "./cellarOrder";
import type { AddBottlesRequest, Bottle, CellarBeer, PublicCellar, UpdateBottleRequest } from "./types";

const readEntries = async (): Promise<EntryDto[]> => {
  const response = await generatedListEntries();
  // Narrowed on `response.status` itself (a status literal per branch), not a
  // derived variable — that's what lets TS discriminate `response.data`.
  if (response.status !== 200) {
    throw apiError("http", `Cellar entries lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

export const listCellarEntries = async (): Promise<CellarBeer[]> => (await readEntries()).map(toCellarBeer);

/** Bottles the caller holds, by beer id — the cellar marker on catalog pages. */
export const heldBottlesByBeer = async (): Promise<Map<string, number>> =>
  new Map((await readEntries()).map((entry) => [entry.beer.id, entry.quantity]));

/** `heldBottlesByBeer`, or nothing when the read fails: the marker only
 *  decorates a catalog page, so a failure leaves it out (ADR-0069). */
export const heldBottlesByBeerOrNone = (): Promise<Map<string, number> | undefined> =>
  heldBottlesByBeer().catch((error: unknown) => {
    logger.error(error);
    return undefined;
  });

const toCellarBeer = (entry: EntryDto | PublicCellarEntryDto): CellarBeer => ({
  entryId: entry.id,
  beerId: entry.beer.id,
  beerName: entry.beer.name,
  breweryName: entry.beer.brewery,
  style: entry.beer.style,
  abv: entry.beer.abv,
  bottles: inVintageOrder(entry.bottles),
});

// 404 — for an unknown username, a missing profile or a cellar that is not
// public alike — is "nothing to show here", not a transport failure (ADR-0023,
// ADR-0050): the caller renders the ordinary not-found page for it. So is 400,
// a username longer than any account can have, and a username kaliaFetch
// refuses to put in a path.
export const getPublicCellar = async (username: string): Promise<PublicCellar | null> => {
  const response = await generatedReadPublicCellar(username).catch((error: unknown) => {
    if (isApiError(error) && error.kind === "refused") {
      return null;
    }
    throw error;
  });
  if (response === null) {
    return null;
  }
  // Widened via Number() so the 5xx branch below stays reachable: the
  // generated type is a 200|400|404 union and a literal check would narrow it away.
  const status = Number(response.status);
  if (response.status === 200) {
    return { username: response.data.username, beers: response.data.entries.map(toCellarBeer) };
  }
  if (status === 404 || status === 400) {
    return null;
  }
  throw apiError("http", `Public cellar lookup failed with status ${status}`, { status });
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
