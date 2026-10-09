import Link from "next/link";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const westvleteren12 = {
  id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  brewery: { id: "br1", name: "Brouwerij Westvleteren", country: "Belgium", city: "Vleteren" },
};

const rochefort10 = { ...westvleteren12, id: "r10", name: "Rochefort 10", abv: 11.3 };

vi.mock("@/features/catalog/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/catalog/api")>()),
  getBeer: vi.fn(async (id: string) => (id === westvleteren12.id ? westvleteren12 : null)),
  searchBeers: vi.fn(async () => ({
    content: [rochefort10, westvleteren12],
    totalElements: 3,
    totalPages: 1,
    page: 0,
  })),
}));

vi.mock("@/features/cellar/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/cellar/api")>()),
  heldBottlesByBeerOrNone: vi.fn(async () => new Map([[westvleteren12.id, 3]])),
}));

import { auth } from "@/auth";
import { searchBeers } from "@/features/catalog";
import BeerPage, { generateMetadata } from "./page";

type Element = ReactElement<Record<string, unknown> & { children?: unknown }>;

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) {
    return node.flatMap(elements);
  }
  if (!node || typeof node !== "object" || !("props" in node)) {
    return [];
  }
  const element = node as Element;
  const props = element.props as Record<string, unknown>;
  return [element, ...elements(props.children), ...elements(props.actions)];
};

const render = (search: Record<string, string> = {}, id = westvleteren12.id) =>
  BeerPage({ params: Promise.resolve({ locale: "en", id }), searchParams: Promise.resolve(search) });

const backLink = (tree: unknown) => elements(tree).find((element) => element.type === Link);

// Do not render the full tree here — see app/[locale]/beers/page.test.tsx.
// This file covers BeerPage's own logic: fetching, the way back, not-found
// and metadata.
describe("BeerPage", () => {
  beforeEach(() => {
    vi.mocked(searchBeers).mockClear();
  });

  it("links back to the exact search that led here, filters, sort and page included", async () => {
    const tree = await render({ country: "Belgium", minAbv: "8", sort: "abv,desc", page: "1" });

    const link = backLink(tree);
    expect(link?.props.href).toBe("/en/beers?country=Belgium&minAbv=8&page=1&sort=abv%2Cdesc");
    expect(link?.props.children).toBe("← Back to results");
  });

  it("links back to the catalog itself when no search led here", async () => {
    const link = backLink(await render());

    expect(link?.props.href).toBe("/en/beers");
    expect(link?.props.children).toBe("← Back to catalog");
  });

  it("asks for its style's strongest beers and its country's count, and drops itself from the list", async () => {
    const tree = await render();

    expect(searchBeers).toHaveBeenCalledWith({ style: "Quadrupel", sort: "abv,desc", size: "6" });
    expect(searchBeers).toHaveBeenCalledWith({ country: "Belgium", size: "1" });
    const view = elements(tree).find((element) => element.props.styleCount !== undefined);
    expect(view?.props).toMatchObject({ styleCount: 3, countryCount: 3, heldBottles: undefined });
    const sameStyle = elements(tree).find((element) => Array.isArray(element.props.beers));
    expect((sameStyle?.props.beers as { id: string }[]).map((beer) => beer.id)).toEqual(["r10"]);
  });

  it("marks the bottles a signed-in visitor holds", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { name: "olutharrastaja_88" }, expires: "" } as never);

    const view = elements(await render()).find((element) => element.props.styleCount !== undefined);

    expect(view?.props.heldBottles).toBe(3);
  });

  it("triggers the not-found page for an unknown beer", async () => {
    await expect(render({}, "unknown")).rejects.toThrow();
  });
});

describe("generateMetadata", () => {
  const metadata = (locale: string, id: string) =>
    generateMetadata({ params: Promise.resolve({ locale, id }), searchParams: Promise.resolve({}) });

  it("titles the page after the beer", async () => {
    await expect(metadata("en", westvleteren12.id)).resolves.toEqual({ title: "Westvleteren 12 — Kalia" });
  });

  it("uses the translated not-found title for an unknown beer", async () => {
    await expect(metadata("en", "unknown")).resolves.toEqual({ title: "Beer not found — Kalia" });
  });

  it("uses the Finnish not-found title", async () => {
    await expect(metadata("fi", "unknown")).resolves.toEqual({ title: "Olutta ei löytynyt — Kalia" });
  });
});
