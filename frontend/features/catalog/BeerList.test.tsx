import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerList } from "./BeerList";
import type { BeerSummary } from "./types";

const westvleteren12: BeerSummary = {
  id: "b1",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  brewery: { id: "br1", name: "Brouwerij Westvleteren" },
};

const orval: BeerSummary = {
  id: "b2",
  name: "Orval",
  style: "Belgian Pale Ale",
  abv: 6.2,
  brewery: { id: "br2", name: "Brasserie d'Orval" },
};

describe("BeerList", () => {
  it("renders each beer as a ruled row: name, brewery, style, strength and a strip of its style's colour", async () => {
    const { container } = render(await BeerList({ locale: "en", beers: [westvleteren12] }));

    expect(screen.getByRole("heading", { level: 2, name: "Westvleteren 12" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute("href", "/en/beers/b1");
    expect(screen.getByText("Brouwerij Westvleteren")).toBeInTheDocument();
    expect(screen.getByText("Quadrupel")).toBeInTheDocument();
    expect(screen.getByText("10.2 %")).toBeInTheDocument();
    expect(container.querySelector('[data-beer-style="belgian-dark"][aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("carries the search it came from on to each beer's page", async () => {
    render(
      await BeerList({
        locale: "en",
        beers: [westvleteren12],
        search: { country: "Belgium", sort: "abv,desc", page: "1" },
      }),
    );

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute(
      "href",
      "/en/beers/b1?country=Belgium&page=1&sort=abv%2Cdesc",
    );
  });

  it("marks only the beers the visitor holds, with their bottle count", async () => {
    render(
      await BeerList({ locale: "en", beers: [westvleteren12, orval], heldBottles: new Map([["b2", 6]]) }),
    );

    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).queryByText(/in your cellar/)).not.toBeInTheDocument();
    expect(within(second).getByText("6 in your cellar")).toBeInTheDocument();
  });

  it("renders a result set of exactly one as a single row", async () => {
    render(await BeerList({ locale: "en", beers: [orval] }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("names its beers one level down when it sits under a section heading", async () => {
    render(await BeerList({ locale: "en", beers: [orval], headingLevel: 3 }));

    expect(screen.getByRole("heading", { level: 3, name: "Orval" })).toBeInTheDocument();
  });

  it("shows an empty state with a way back when nothing matches, as a plain anchor", async () => {
    const { container } = render(await BeerList({ locale: "en", beers: [] }));

    expect(screen.getByText(/no beers match/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clear/i })).toHaveAttribute("href", "/en/beers");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish with a decimal comma and locale-prefixed links", async () => {
    render(await BeerList({ locale: "fi", beers: [westvleteren12], heldBottles: new Map([["b1", 1]]) }));

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute("href", "/fi/beers/b1");
    expect(screen.getByText("10,2 %")).toBeInTheDocument();
    expect(screen.getByText("1 kellarissasi")).toBeInTheDocument();
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
