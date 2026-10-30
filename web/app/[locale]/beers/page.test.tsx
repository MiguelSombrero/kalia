import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const westvleteren12 = {
  id: "b1",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  brewery: { id: "br1", name: "Brouwerij Westvleteren" },
};

vi.mock("@/features/catalog/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/catalog/api")>()),
  searchBeers: vi.fn(async () => ({ content: [], totalElements: 0, totalPages: 0, page: 0 })),
  listBreweryCountries: vi.fn(async () => ["SE", "BE"]),
}));

vi.mock("@/features/cellar/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/cellar/api")>()),
  heldBottlesByBeerOrNone: vi.fn(async () => new Map([["b1", 2]])),
}));

import { auth } from "@/auth";
import { apiError } from "@kalia/api";
import { IgnoredFilterNote, PastLastPage, searchBeers } from "@/features/catalog";
import BeersPage, { generateMetadata } from "./page";

type Element = ReactElement<Record<string, unknown> & { children?: unknown }>;

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) {
    return node.flatMap(elements);
  }
  if (!node || typeof node !== "object" || !("props" in node)) {
    return [];
  }
  const element = node as Element;
  return [element, ...elements((element.props as { children?: unknown }).children)];
};

const render = (search: Record<string, string | string[]>) =>
  BeersPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(search) });

const beerList = (tree: unknown) => elements(tree).find((element) => Array.isArray(element.props.beers));

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and BeersPage composes several
// of them. This file covers BeersPage's own logic (param parsing and
// normalization, what it hands its children, metadata); the children
// have their own tests and E2E cover.
describe("BeersPage", () => {
  beforeEach(() => {
    vi.mocked(searchBeers).mockClear();
  });

  it("parses raw search params (including array values) before calling searchBeers", async () => {
    await render({ query: ["punk", "ignored"], minAbv: "5" });

    expect(searchBeers).toHaveBeenCalledWith({ query: "punk", minAbv: "5" });
  });

  it("hands the country filter the countries the catalog has breweries in", async () => {
    const filters = elements(await render({})).find((element) => element.props.countryCodes !== undefined);

    expect(filters?.props.countryCodes).toEqual(["SE", "BE"]);
  });

  it("answers a page past the last with its own empty state rather than the list or a redirect", async () => {
    vi.mocked(searchBeers).mockResolvedValueOnce({ content: [], totalElements: 54, totalPages: 3, page: 40 });

    const tree = await render({ countryCode: "BE", page: "40" });

    expect(elements(tree).find((element) => element.type === PastLastPage)?.props.params).toMatchObject({
      countryCode: "BE",
      page: "40",
    });
    expect(beerList(tree)).toBeUndefined();
  });

  it("searches without a value the API would refuse, and notes that it was left out", async () => {
    const tree = await render({ query: "punk", minAbv: "150" });

    expect(searchBeers).toHaveBeenCalledWith({ query: "punk" });
    expect(elements(tree).some((element) => element.type === IgnoredFilterNote)).toBe(true);
  });

  it("searches again without a country the API refuses, and notes that it was left out", async () => {
    vi.mocked(searchBeers).mockRejectedValueOnce(apiError("http", "Beer search failed with status 400", { status: 400 }));

    const tree = await render({ query: "punk", countryCode: "ZZ" });

    expect(searchBeers).toHaveBeenNthCalledWith(1, { query: "punk", countryCode: "ZZ" });
    expect(searchBeers).toHaveBeenNthCalledWith(2, { query: "punk" });
    expect(elements(tree).some((element) => element.type === IgnoredFilterNote)).toBe(true);
    expect(elements(tree).find((element) => element.props.countryCodes !== undefined)?.props.params).toEqual({
      query: "punk",
    });
  });

  it("does not hide a failure that no country caused", async () => {
    vi.mocked(searchBeers).mockRejectedValueOnce(apiError("http", "Beer search failed with status 500", { status: 500 }));

    await expect(render({ countryCode: "BE" })).rejects.toMatchObject({ status: 500 });
    expect(searchBeers).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400 when no country was asked for", async () => {
    vi.mocked(searchBeers).mockRejectedValueOnce(apiError("http", "Beer search failed with status 400", { status: 400 }));

    await expect(render({ query: "punk" })).rejects.toMatchObject({ status: 400 });
    expect(searchBeers).toHaveBeenCalledTimes(1);
  });

  it("notes nothing when every value is usable", async () => {
    const tree = await render({ query: "punk", minAbv: "12", maxAbv: "9" });

    expect(searchBeers).toHaveBeenCalledWith({ query: "punk", minAbv: "9", maxAbv: "12" });
    expect(elements(tree).some((element) => element.type === IgnoredFilterNote)).toBe(false);
  });

  it("hands the list its search, so each beer can link back to it, and no cellar when signed out", async () => {
    vi.mocked(searchBeers).mockResolvedValueOnce({ content: [westvleteren12], totalElements: 1, totalPages: 1, page: 0 });

    const list = beerList(await render({ style: "Quadrupel" }));

    expect(list?.props.search).toMatchObject({ style: "Quadrupel" });
    expect(list?.props.heldBottles).toBeUndefined();
  });

  it("hands the list the bottles a signed-in visitor holds", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { name: "olutharrastaja_88" }, expires: "" } as never);
    vi.mocked(searchBeers).mockResolvedValueOnce({ content: [westvleteren12], totalElements: 1, totalPages: 1, page: 0 });

    const list = beerList(await render({}));

    expect((list?.props.heldBottles as Map<string, number>).get("b1")).toBe(2);
  });
});

describe("generateMetadata", () => {
  it("titles the page in English", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toEqual({ title: "Beer catalog — Kalia" });
  });

  it("titles the page in Finnish", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: "fi" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toEqual({ title: "Oluet - Kalia" });
  });
});
