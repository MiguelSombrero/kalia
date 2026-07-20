import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BeerPage } from "@/features/catalog/types";

vi.mock("@/features/catalog/api", () => ({
  searchBeers: vi.fn(async (): Promise<BeerPage> => ({
    content: [
      {
        id: "b1",
        name: "Punk IPA",
        style: "IPA",
        abv: 5.4,
        price: { cents: 340, currency: "EUR" },
        brewery: { id: "br1", name: "BrewDog" },
      },
    ],
    totalElements: 1,
    totalPages: 1,
    page: 0,
  })),
}));

import BeersPage from "./page";

describe("BeersPage", () => {
  it("renders heading, filters and the beers from the API", async () => {
    const ui = await BeersPage({
      searchParams: Promise.resolve({ query: "punk" }),
    });
    render(ui);

    expect(screen.getByRole("heading", { level: 1, name: /beer catalog/i })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText("Punk IPA")).toBeInTheDocument();
    expect(screen.getByText("BrewDog")).toBeInTheDocument();
  });
});
