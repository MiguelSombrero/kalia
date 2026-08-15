import { describe, expect, it, vi } from "vitest";

const westvleteren12 = {
  id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  description: "Dark strong Trappist ale.",
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren", country: "Belgium", city: "Vleteren" },
};

vi.mock("@/features/catalog/api", () => ({
  getBeer: vi.fn(async (id: string) =>
    id === westvleteren12.id ? westvleteren12 : null,
  ),
}));

import BeerPage, { generateMetadata } from "./page";

// Do not render the full tree here — see app/[locale]/beers/page.test.tsx.
// This file covers BeerPage's own logic: fetching, not-found and metadata.
describe("BeerPage", () => {
  it("does not trigger not-found for a known beer", async () => {
    await expect(
      BeerPage({ params: Promise.resolve({ locale: "en", id: westvleteren12.id }) }),
    ).resolves.toBeDefined();
  });

  it("triggers the not-found page for an unknown beer", async () => {
    await expect(
      BeerPage({ params: Promise.resolve({ locale: "en", id: "unknown" }) }),
    ).rejects.toThrow();
  });
});

describe("generateMetadata", () => {
  it("titles the page after the beer", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "en", id: westvleteren12.id }) }),
    ).resolves.toEqual({ title: "Westvleteren 12 — Kalia" });
  });

  it("uses the translated not-found title for an unknown beer", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "en", id: "unknown" }) }),
    ).resolves.toEqual({ title: "Beer not found — Kalia" });
  });

  it("uses the Finnish not-found title", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "fi", id: "unknown" }) }),
    ).resolves.toEqual({ title: "Olutta ei löytynyt — Kalia" });
  });
});
