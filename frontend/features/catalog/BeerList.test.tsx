import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerList } from "./BeerList";
import type { BeerSummary } from "./types";

const westvleteren12: BeerSummary = {
  id: "b1",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren" },
};

describe("BeerList", () => {
  it("renders beer name, brewery, style, abv and formatted price", async () => {
    const { container } = render(await BeerList({ locale: "en", beers: [westvleteren12] }));

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute(
      "href",
      "/en/beers/b1",
    );
    expect(screen.getByText("Brouwerij Westvleteren")).toBeInTheDocument();
    expect(screen.getByText(/Quadrupel/)).toBeInTheDocument();
    expect(screen.getByText(/10\.2\s?%/)).toBeInTheDocument();
    expect(screen.getByText("€12.50")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows an empty state with a way back when nothing matches", async () => {
    render(await BeerList({ locale: "en", beers: [] }));

    expect(screen.getByText(/no beers match/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clear/i })).toHaveAttribute("href", "/en/beers");
  });

  it("renders in Finnish with locale-prefixed links", async () => {
    render(await BeerList({ locale: "fi", beers: [westvleteren12] }));

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute(
      "href",
      "/fi/beers/b1",
    );
    expect(screen.getByText(/12,50\s€/)).toBeInTheDocument();
  });

  it("shows the Finnish empty state", async () => {
    render(await BeerList({ locale: "fi", beers: [] }));

    expect(screen.getByText("Hakuehdoilla ei löytynyt oluita.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tyhjennä kaikki suodattimet" })).toHaveAttribute(
      "href",
      "/fi/beers",
    );
  });
});
