import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  addBeer: vi.fn(),
  findBreweries: vi.fn(),
  getBeer: vi.fn(),
  findSimilarBeers: vi.fn(),
  listCountries: vi.fn(),
  listStyles: vi.fn(),
  searchBeers: vi.fn(),
}));
vi.mock("./api", () => api);
const { revalidatePath, signIn } = vi.hoisted(() => ({ revalidatePath: vi.fn(), signIn: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/auth", () => ({ signIn }));

import {
  addBeerAction,
  findBreweriesAction,
  findSimilarBeersAction,
  loadAddBeerOptionsAction,
  startCatalogSignIn,
} from "./actions";

const breweryId = "7f1c2a3b-0000-4000-8000-000000000001";
const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";
const pohjala = { id: breweryId, name: "Põhjala", countryCode: "EE", city: "Tallinn" };
const request = { name: "Öö Bourbon", style: "Imperial Stout", abv: 12.5, breweryId };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addBeerAction", () => {
  const added = {
    kind: "added",
    beer: { id: beerId, name: "Öö Bourbon", style: "Imperial Stout", abv: 12.5, brewery: pohjala },
  };
  const firstPage = (...ids: string[]) => ({ content: ids.map((id) => ({ id })), totalElements: ids.length });

  it("answers with the new beer and refreshes the catalog's searches", async () => {
    api.addBeer.mockResolvedValue(added);
    api.searchBeers.mockResolvedValue(firstPage(beerId));

    await expect(addBeerAction(request)).resolves.toEqual({
      kind: "added",
      beer: { id: beerId, name: "Öö Bourbon" },
      landsOnSearch: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/beers", "page");
    expect(api.searchBeers).toHaveBeenCalledWith({ query: "Öö Bourbon" });
  });

  it("lands on the beer's own page when a search for its name would not show it first", async () => {
    api.addBeer.mockResolvedValue(added);
    api.searchBeers.mockResolvedValue(firstPage("5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e99"));

    await expect(addBeerAction(request)).resolves.toMatchObject({ kind: "added", landsOnSearch: false });
  });

  it("lands on the beer's own page when that search fails, since the beer exists either way", async () => {
    api.addBeer.mockResolvedValue(added);
    api.searchBeers.mockRejectedValue(new Error("search down"));

    await expect(addBeerAction(request)).resolves.toMatchObject({ kind: "added", landsOnSearch: false });
  });

  it("names the beer a duplicate duplicates, and its brewery", async () => {
    api.addBeer.mockResolvedValue({ kind: "duplicateBeer", existingBeerId: beerId });
    api.getBeer.mockResolvedValue({ id: beerId, name: "Öö", style: "Imperial Stout", abv: 10.5, brewery: pohjala });

    await expect(addBeerAction({ ...request, name: "öö" })).resolves.toEqual({
      kind: "duplicateBeer",
      existing: { id: beerId, name: "Öö", breweryName: "Põhjala" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("still links a duplicate whose details could not be read, by the name the user gave", async () => {
    api.addBeer.mockResolvedValue({ kind: "duplicateBeer", existingBeerId: beerId });
    api.getBeer.mockResolvedValue(null);

    await expect(addBeerAction(request)).resolves.toEqual({
      kind: "duplicateBeer",
      existing: { id: beerId, name: "Öö Bourbon", breweryName: "" },
    });
  });

  it("names a duplicate brewery as the catalog spells it, not as it was typed, in the reader's language", async () => {
    api.addBeer.mockResolvedValue({
      kind: "duplicateBrewery",
      existing: { id: breweryId, name: "Ruosniemen Panimo", countryCode: "FI" },
    });
    const newBrewery = { name: "Ruosniemen-Panimo", countryCode: "FI" };

    await expect(addBeerAction({ ...request, breweryId: undefined, newBrewery }, "fi")).resolves.toEqual({
      kind: "duplicateBrewery",
      existing: { id: breweryId, name: "Ruosniemen Panimo", place: "Suomi" },
    });
    expect(api.findBreweries).not.toHaveBeenCalled();
  });

  it("passes a refusal through for the form to mark", async () => {
    const refused = { kind: "refused", fields: [{ field: "style", message: "unknown" }] };
    api.addBeer.mockResolvedValue(refused);

    await expect(addBeerAction(request)).resolves.toEqual(refused);
  });
});

describe("the form's reads", () => {
  it("loads the styles, and the countries named and sorted in the reader's language", async () => {
    api.listStyles.mockResolvedValue(["IPA", "Porter"]);
    api.listCountries.mockResolvedValue(["SE", "FI", "EE"]);

    await expect(loadAddBeerOptionsAction("fi")).resolves.toEqual({
      styles: ["IPA", "Porter"],
      countries: [
        { code: "SE", name: "Ruotsi" },
        { code: "FI", name: "Suomi" },
        { code: "EE", name: "Viro" },
      ],
    });
  });

  it("offers breweries with their place named, and falls back to English for a locale it does not know", async () => {
    api.findBreweries.mockResolvedValue([pohjala, { id: "b2", name: "Põhjala Tap Room", countryCode: "EE" }]);

    await expect(findBreweriesAction("põhjala", "xx")).resolves.toEqual([
      { id: breweryId, name: "Põhjala", place: "Tallinn, Estonia" },
      { id: "b2", name: "Põhjala Tap Room", place: "Estonia" },
    ]);
  });

  it("does not search for a blank or over-long name", async () => {
    await expect(findBreweriesAction("  ", "en")).resolves.toEqual([]);
    await findBreweriesAction("x".repeat(150), "en");

    expect(api.findBreweries).toHaveBeenCalledOnce();
    expect(api.findBreweries).toHaveBeenCalledWith("x".repeat(100));
  });

  it("finds a brewery's similarly named beers, and nothing for an id that is not one or a blank name", async () => {
    api.findSimilarBeers.mockResolvedValue([
      { id: beerId, name: "Öö", style: "Imperial Stout", abv: 10.5, brewery: pohjala },
    ]);

    await expect(findSimilarBeersAction(breweryId, "Öö Bourbon")).resolves.toEqual([
      { id: beerId, name: "Öö", style: "Imperial Stout", abv: 10.5 },
    ]);
    expect(api.findSimilarBeers).toHaveBeenCalledWith(breweryId, "Öö Bourbon");
    await expect(findSimilarBeersAction("../etc", "Öö")).resolves.toEqual([]);
    await expect(findSimilarBeersAction(breweryId, "  ")).resolves.toEqual([]);
    expect(api.findSimilarBeers).toHaveBeenCalledOnce();
  });
});

describe("startCatalogSignIn", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    Object.entries(fields).forEach(([key, value]) => data.set(key, value));
    return data;
  };

  it("returns to the same search, in the reader's language", async () => {
    await startCatalogSignIn(form({ locale: "fi", query: "Öö Bourbon" }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: "/fi/beers?query=%C3%96%C3%B6+Bourbon" },
      { ui_locales: "fi" },
    );
  });

  it("returns to the whole search, not only its term", async () => {
    await startCatalogSignIn(form({ locale: "en", query: "Porter", style: "Porter", countryCode: "FI", sort: "abv,desc" }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: "/en/beers?query=Porter&style=Porter&countryCode=FI&sort=abv%2Cdesc" },
      { ui_locales: "en" },
    );
  });

  // Built from validated parts, never taken as a path: an open redirect otherwise.
  it("never redirects anywhere but the catalog", async () => {
    await startCatalogSignIn(form({ locale: "https://evil.example", query: "x".repeat(150) }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: `/en/beers?query=${"x".repeat(100)}` },
      { ui_locales: "en" },
    );
  });
});
