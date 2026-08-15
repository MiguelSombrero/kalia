import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalog/api", () => ({
  searchBeers: vi.fn(async () => ({
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
  })),
}));

import { searchBeers } from "@/features/catalog";
import BeersPage, { generateMetadata } from "./page";

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and BeersPage composes three
// of them. This file covers BeersPage's own logic (param parsing, metadata);
// the children have their own tests and E2E cover.
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
    ).resolves.toEqual({ title: "Oluet - Kalia" });
  });
});
