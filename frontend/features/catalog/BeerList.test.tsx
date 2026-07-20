import { render, screen } from "@testing-library/react";
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
  it("renders beer name, brewery, style, abv and formatted price", () => {
    render(<BeerList beers={[westvleteren12]} />);

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute(
      "href",
      "/beers/b1",
    );
    expect(screen.getByText("Brouwerij Westvleteren")).toBeInTheDocument();
    expect(screen.getByText(/Quadrupel/)).toBeInTheDocument();
    expect(screen.getByText(/10\.2\s?%/)).toBeInTheDocument();
    expect(screen.getByText("€12.50")).toBeInTheDocument();
  });

  it("shows an empty state with a way back when nothing matches", () => {
    render(<BeerList beers={[]} />);

    expect(screen.getByText(/no beers match/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clear/i })).toHaveAttribute("href", "/beers");
  });
});
