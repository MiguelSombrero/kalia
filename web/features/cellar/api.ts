import { apiError, isApiError } from "@kalia/api";
import { logger } from "@/lib/logger";
import {
  addBottles as generatedAddBottles,
  listEntries as generatedListEntries,
  readHoldings as generatedReadHoldings,
  removeBottle as generatedRemoveBottle,
  updateBottle as generatedUpdateBottle,
} from "@kalia/api/generated/cellar/cellar";
import type { EntryDto, HoldingsDto, PublicCellarEntryDto } from "@kalia/api/generated/models";
import { read as generatedReadPublicCellar } from "@kalia/api/generated/public-cellar/public-cellar";
import { inVintageOrder } from "./cellarOrder";
import type { CellarTotals } from "./cellarTotals";
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

const readHoldings = async (beerIds: readonly string[]): Promise<HoldingsDto> => {
  const response = await generatedReadHoldings(beerIds.length > 0 ? { beerIds: [...beerIds] } : undefined);
  if (response.status !== 200) {
    throw apiError("http", `Cellar holdings lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

/** Bottles the caller holds of the given beers, by beer id — the cellar marker
 *  on a page of catalog beers. A beer not held is absent. */
export const heldBottlesOf = async (beerIds: readonly string[]): Promise<Map<string, number>> => {
  if (beerIds.length === 0) {
    return new Map();
  }
  return new Map((await readHoldings(beerIds)).held.map((held) => [held.beerId, held.quantity]));
};

/** `heldBottlesOf`, or nothing when the read fails: the marker only decorates
 *  a catalog page, so a failure leaves it out (ADR-0069). */
export const heldBottlesOfOrNone = (beerIds: readonly string[]): Promise<Map<string, number> | undefined> =>
  heldBottlesOf(beerIds).catch((error: unknown) => {
    logger.error(error);
    return undefined;
  });

/** The caller's beers and bottles in all, without reading the cellar. */
export const getCellarTotals = async (): Promise<CellarTotals> => {
  const { totalBeers, totalBottles } = await readHoldings([]);
  return { beers: totalBeers, bottles: totalBottles };
};

const toCellarBeer = (entry: EntryDto | PublicCellarEntryDto): CellarBeer => ({
  entryId: entry.id,
  beerId: entry.beer.id,
  beerName: entry.beer.name,
  breweryName: entry.beer.brewery,
  style: entry.beer.style,
  abv: entry.beer.abv,
  bottles: inVintageOrder(entry.bottles),
  ...(entry.quantity > entry.bottles.length && { unlistedBottles: entry.quantity - entry.bottles.length }),
});

// 404 — for an unknown username, a missing profile or a cellar that is not
// public alike — is "nothing to show here", not a transport failure (ADR-0023,
// ADR-0050): the caller renders the ordinary not-found page for it. So is 400,
// a username longer than any account can have, and a username kaliaFetch
// refuses to put in a path.
export const getPublicCellar = async (username: string, page = 0): Promise<PublicCellar | null> => {
  const response = await generatedReadPublicCellar(username, page > 0 ? { page } : undefined).catch((error: unknown) => {
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
    const { content, totalElements, ...rest } = response.data;
    return { ...rest, beers: content.map(toCellarBeer), totalBeers: totalElements };
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
