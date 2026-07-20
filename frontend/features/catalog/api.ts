import type { BeerDetails, BeerPage, BeerSearchParams } from "./types";

const PARAM_KEYS = [
  "query",
  "style",
  "country",
  "minAbv",
  "maxAbv",
  "page",
  "size",
  "sort",
] as const;

export function buildBeerSearchParams(params: BeerSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = params[key];
    if (value) {
      searchParams.set(key, value);
    }
  }
  return searchParams;
}

function backendUrl(): string {
  return process.env.BACKEND_URL ?? "http://localhost:8080";
}

export async function searchBeers(params: BeerSearchParams): Promise<BeerPage> {
  const qs = buildBeerSearchParams(params).toString();
  const response = await fetch(`${backendUrl()}/api/v1/beers${qs ? `?${qs}` : ""}`);
  if (!response.ok) {
    throw new Error(`Beer search failed with status ${response.status}`);
  }
  return response.json();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves to null when no beer exists for the id — including malformed ids
 *  from user-typed URLs, which the backend would reject with a 400. */
export async function getBeer(id: string): Promise<BeerDetails | null> {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }
  const response = await fetch(`${backendUrl()}/api/v1/beers/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Beer lookup failed with status ${response.status}`);
  }
  return response.json();
}
