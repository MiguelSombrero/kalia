"use server";

import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { toLocale, type Locale } from "@/i18n/settings";
import { addBeer, findBreweries, getBeer, listBreweryBeers, listCountries, listStyles } from "./api";
import { countriesByName, countryName } from "./country";
import { catalogHref } from "./links";
import type { AddBeerOptions, AddBeerOutcome, AddBeerRequest, Brewery, BreweryOption } from "./types";

// The catalog API's bound on a search term (CatalogController.MAX_FILTER_LENGTH):
// a longer one is a 400, not an empty answer.
const MAX_QUERY_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Do not re-export this from a shared lib/ module instead of defining it here:
// a Server Action re-exported through a second "use server" file fails at
// runtime with UnrecognizedActionError (frontend/README.md traps).
export const startCatalogSignIn = async (formData?: FormData) => {
  const rawLocale = formData?.get("locale");
  const locale = toLocale(typeof rawLocale === "string" ? rawLocale : "");
  const rawQuery = formData?.get("query");
  const query = typeof rawQuery === "string" ? rawQuery.slice(0, MAX_QUERY_LENGTH) : undefined;
  // Rebuilt from validated parts, never taken as a path: handing signIn's
  // redirectTo a caller-supplied string is an open redirect.
  await signIn("keycloak", { redirectTo: catalogHref(locale, { query }) }, { ui_locales: locale });
};

const place = (brewery: Brewery, locale: Locale): string => {
  const country = countryName(brewery.countryCode, locale);
  return brewery.city ? `${brewery.city}, ${country}` : country;
};

const toOption = (brewery: Brewery, locale: Locale): BreweryOption => ({
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

export const listBreweryBeersAction = async (
  breweryId: string,
): Promise<{ id: string; name: string; style: string; abv: number }[]> => {
  if (!UUID_PATTERN.test(breweryId)) {
    return [];
  }
  const beers = await listBreweryBeers(breweryId);
  return beers.map(({ id, name, style, abv }) => ({ id, name, style, abv }));
};

export const addBeerAction = async (request: AddBeerRequest, locale: string = "en"): Promise<AddBeerOutcome> => {
  const result = await addBeer(request);
  switch (result.kind) {
    case "added":
      revalidatePath("/[locale]/beers", "page");
      return { kind: "added", beer: { id: result.beer.id, name: result.beer.name } };
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
    case "duplicateBrewery": {
      const asked = request.newBrewery;
      const matches = asked ? await findBreweries(asked.name.slice(0, MAX_QUERY_LENGTH)) : [];
      const existing = matches.find((brewery) => brewery.id === result.existingBreweryId) ?? {
        id: result.existingBreweryId,
        name: asked?.name ?? "",
        countryCode: asked?.countryCode ?? "",
        city: asked?.city,
      };
      return { kind: "duplicateBrewery", existing: toOption(existing, toLocale(locale)) };
    }
    case "refused":
      return result;
  }
};
