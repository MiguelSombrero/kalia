import { describe, expect, it, vi } from "vitest";
import type { BeerPage } from "@/features/catalog/types";

vi.mock("@/features/catalog/api", () => ({
  searchBeers: vi.fn(async (): Promise<BeerPage> => ({
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
  })),
}));

import { searchBeers } from "@/features/catalog/api";
import BeersPage, { generateMetadata } from "./page";

// BeersPage composes SearchFilters/BeerList/Pagination, which are themselves
// async Server Components — React (correctly) suspends indefinitely if you
// try to render() such a tree outside Next's RSC runtime, so this file tests
// BeersPage's own logic (param parsing, metadata) rather than rendering the
// full tree. The composed page is covered by each child's own unit test
// (rendered directly, no unresolved async descendants) and by Playwright E2E.
describe("BeersPage", () => {
  it("parses raw search params (including array values) before calling searchBeers", async () => {
    await BeersPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ query: ["punk", "ignored"], minAbv: "5" }),
    });

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
    ).resolves.toEqual({ title: "Oluttarjonta — Kalia" });
  });
});
