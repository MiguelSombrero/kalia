"use server";

import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { toLocale, type Locale } from "@/i18n/settings";
import { addBeer, findBreweries, findSimilarBeers, getBeer, listCountries, listStyles, searchBeers } from "./api";
import { countriesByName, countryName } from "./country";
import { catalogHref, PARAM_KEYS, parseBeerSearchParams } from "./links";
import type { AddBeerOptions, AddBeerOutcome, AddBeerRequest, Brewery, BreweryOption } from "./types";

// The catalog API's bound on a search term (CatalogController.MAX_FILTER_LENGTH):
// a longer one is a 400, not an empty answer.
const MAX_QUERY_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Do not re-export this from a shared lib/ module instead of defining it here:
// a Server Action re-exported through a second "use server" file fails at
// runtime with UnrecognizedActionError (frontend/README.md traps).
export const startCatalogSignIn = async (formData?: FormData) => {
  const field = (name: string) => {
    const value = formData?.get(name);
    return typeof value === "string" ? value.slice(0, MAX_QUERY_LENGTH) : undefined;
  };
  const locale = toLocale(field("locale") ?? "");
  const search = parseBeerSearchParams(Object.fromEntries(PARAM_KEYS.map((key) => [key, field(key)])));
  // Rebuilt from validated parts, never taken as a path: handing signIn's
  // redirectTo a caller-supplied string is an open redirect.
  await signIn("keycloak", { redirectTo: catalogHref(locale, search) }, { ui_locales: locale });
};

const place = (brewery: Pick<Brewery, "countryCode" | "city">, locale: Locale): string => {
  const country = countryName(brewery.countryCode, locale);
  return brewery.city ? `${brewery.city}, ${country}` : country;
};

const toOption = (brewery: Pick<Brewery, "id" | "name" | "countryCode" | "city">, locale: Locale): BreweryOption => ({
  id: brewery.id,
  name: brewery.name,
  place: place(brewery, locale),
});

export const loadAddBeerOptionsAction = async (locale: string): Promise<AddBeerOptions> => {
  const [styles, countries] = await Promise.all([listStyles(), listCountries()]);
  return { styles, countries: countriesByName(countries, toLocale(locale)) };
};

export const findBreweriesAction = async (query: string, locale: string): Promise<BreweryOption[]> => {
  const term = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (term === "") {
    return [];
  }
  const breweries = await findBreweries(term);
  return breweries.map((brewery) => toOption(brewery, toLocale(locale)));
};

export const findSimilarBeersAction = async (
  breweryId: string,
  beerName: string,
): Promise<{ id: string; name: string; style: string; abv: number }[]> => {
  if (!UUID_PATTERN.test(breweryId) || beerName.trim() === "") {
    return [];
  }
  const beers = await findSimilarBeers(breweryId, beerName);
  return beers.map(({ id, name, style, abv }) => ({ id, name, style, abv }));
};

// ADR-0082: a common name ("IPA") can sort the new beer off the first page of its own search.
const firstPageOfItsNameShows = async (beer: { id: string; name: string }): Promise<boolean> => {
  try {
    const firstPage = await searchBeers({ query: beer.name });
    return firstPage.content.some((found) => found.id === beer.id);
  } catch {
    return false;
  }
};

export const addBeerAction = async (request: AddBeerRequest, locale: string = "en"): Promise<AddBeerOutcome> => {
  const result = await addBeer(request);
  switch (result.kind) {
    case "added": {
      revalidatePath("/[locale]/beers", "page");
      const beer = { id: result.beer.id, name: result.beer.name };
      return { kind: "added", beer, landsOnSearch: await firstPageOfItsNameShows(beer) };
    }
    case "duplicateBeer": {
      const existing = await getBeer(result.existingBeerId);
      return {
        kind: "duplicateBeer",
        existing: {
          id: result.existingBeerId,
          name: existing?.name ?? request.name,
          breweryName: existing?.brewery.name ?? "",
        },
      };
    }
    case "duplicateBrewery":
      return { kind: "duplicateBrewery", existing: toOption(result.existing, toLocale(locale)) };
    case "refused":
      return result;
  }
};
