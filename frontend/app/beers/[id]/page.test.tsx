import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BeerDetails } from "@/features/catalog/types";

const westvleteren12: BeerDetails = {
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

describe("BeerPage", () => {
  it("renders the beer details and a way back to the catalog", async () => {
    const ui = await BeerPage({ params: Promise.resolve({ id: westvleteren12.id }) });
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: "Westvleteren 12" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to catalog/i })).toHaveAttribute(
      "href",
      "/beers",
    );
  });

  it("triggers the not-found page for an unknown beer", async () => {
    await expect(
      BeerPage({ params: Promise.resolve({ id: "unknown" }) }),
    ).rejects.toThrow();
  });
});

describe("generateMetadata", () => {
  it("titles the page after the beer", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ id: westvleteren12.id }) }),
    ).resolves.toEqual({ title: "Westvleteren 12 — Kalia" });
  });
});
