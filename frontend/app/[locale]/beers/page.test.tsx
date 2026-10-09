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
}));

vi.mock("@/features/cellar/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/cellar/api")>()),
  heldBottlesByBeerOrNone: vi.fn(async () => new Map([["b1", 2]])),
}));

import { auth } from "@/auth";
import { searchBeers } from "@/features/catalog";
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
// of them. This file covers BeersPage's own logic (param parsing, the
// out-of-range redirect, what it hands its children, metadata); the children
// have their own tests and E2E cover.
describe("BeersPage", () => {
  beforeEach(() => {
    vi.mocked(searchBeers).mockClear();
  });

  it("parses raw search params (including array values) before calling searchBeers", async () => {
    await render({ query: ["punk", "ignored"], minAbv: "5" });

    expect(searchBeers).toHaveBeenCalledWith({
      query: "punk",
      style: undefined,
      country: undefined,
      minAbv: "5",
      maxAbv: undefined,
      page: undefined,
      size: undefined,
      sort: undefined,
    });
  });

  it("redirects a page past the last one to the last page, keeping the search", async () => {
    vi.mocked(searchBeers).mockResolvedValueOnce({ content: [], totalElements: 54, totalPages: 3, page: 999 });

    await expect(render({ country: "Belgium", page: "999" })).rejects.toMatchObject({
      digest: expect.stringContaining("/en/beers?country=Belgium&page=2"),
    });
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
