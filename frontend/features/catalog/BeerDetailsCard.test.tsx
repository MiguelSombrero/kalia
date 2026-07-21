import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeerDetailsCard } from "./BeerDetailsCard";
import type { BeerDetails } from "./types";

const westvleteren12: BeerDetails = {
  id: "b1",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  description: "Dark strong Trappist ale with notes of dried fruit.",
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren", country: "Belgium", city: "Vleteren" },
};

describe("BeerDetailsCard", () => {
  it("renders name, brewery with location, style, abv, price and description", async () => {
    render(await BeerDetailsCard({ locale: "en", beer: westvleteren12 }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Westvleteren 12" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Brouwerij Westvleteren — Vleteren, Belgium/)).toBeInTheDocument();
    expect(screen.getByText("Style")).toBeInTheDocument();
    expect(screen.getByText("Quadrupel")).toBeInTheDocument();
    expect(screen.getByText(/10\.2\s?%/)).toBeInTheDocument();
    expect(screen.getByText("€12.50")).toBeInTheDocument();
    expect(screen.getByText(/dried fruit/)).toBeInTheDocument();
  });

  it("omits the city when the brewery has none and skips a missing description", async () => {
    render(
      await BeerDetailsCard({
        locale: "en",
        beer: {
          ...westvleteren12,
          description: null,
          brewery: { ...westvleteren12.brewery, city: null },
        },
      }),
    );

    expect(screen.getByText(/Brouwerij Westvleteren — Belgium/)).toBeInTheDocument();
    expect(screen.queryByText(/dried fruit/)).not.toBeInTheDocument();
  });

  it("renders translated labels and locale-formatted price in Finnish", async () => {
    render(await BeerDetailsCard({ locale: "fi", beer: westvleteren12 }));

    expect(screen.getByText("Tyyli")).toBeInTheDocument();
    expect(screen.getByText("Alkoholi")).toBeInTheDocument();
    expect(screen.getByText("Hinta")).toBeInTheDocument();
    expect(screen.getByText(/12,50\s€/)).toBeInTheDocument();
  });
});
