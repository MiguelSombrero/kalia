import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerDetailsView } from "./BeerDetailsView";
import type { BeerDetails } from "./types";

const westvleteren12: BeerDetails = {
  id: "b1",
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  brewery: { id: "br1", name: "Brouwerij Westvleteren", countryCode: "BE", city: "Vleteren" },
};

const view = (overrides: Partial<Parameters<typeof BeerDetailsView>[0]> = {}) =>
  BeerDetailsView({ locale: "en", beer: westvleteren12, styleCount: 3, countryCount: 15, ...overrides });

describe("BeerDetailsView", () => {
  it("renders name, brewery with location, the style band and the four facts, with no price", async () => {
    const { container } = render(await view());

    expect(screen.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeInTheDocument();
    expect(screen.getByText("Brouwerij Westvleteren — Vleteren, Belgium")).toBeInTheDocument();
    expect(container.querySelector('[data-beer-style="belgian-dark"][aria-hidden="true"]')).toHaveTextContent(
      "10.2%",
    );
    const terms = Array.from(container.querySelectorAll("dt")).map((term) => term.textContent);
    expect(terms).toEqual(["Style", "Strength", "Brewery", "Brewed in"]);
    expect(screen.getByText("10.2 %")).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("leads from its style and its country back into the catalog, with how many there are", async () => {
    render(await view());

    expect(screen.getByRole("link", { name: "Every Quadrupel (3)" })).toHaveAttribute(
      "href",
      "/en/beers?style=Quadrupel",
    );
    expect(screen.getByRole("link", { name: "Everything from Belgium (15)" })).toHaveAttribute(
      "href",
      "/en/beers?countryCode=BE",
    );
  });

  it("names a Swedish brewery's country in the reader's language, in its location and its link", async () => {
    const omnipollo: BeerDetails = {
      ...westvleteren12,
      brewery: { id: "br2", name: "Omnipollo", countryCode: "SE", city: "Stockholm" },
    };

    const { unmount } = render(await view({ beer: omnipollo, countryCount: 40 }));
    expect(screen.getAllByText(/Stockholm, Sweden$/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Everything from Sweden (40)" })).toHaveAttribute(
      "href",
      "/en/beers?countryCode=SE",
    );
    unmount();

    render(await view({ locale: "fi", beer: omnipollo, countryCount: 40 }));
    expect(screen.getAllByText(/Stockholm, Ruotsi$/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Kaikki maasta Ruotsi (40)" })).toHaveAttribute(
      "href",
      "/fi/beers?countryCode=SE",
    );
  });

  it("says how many bottles a signed-in visitor holds, with the way to their cellar", async () => {
    render(await view({ heldBottles: 3 }));

    expect(screen.getByText("In your cellar: 3 bottles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my cellar" })).toHaveAttribute("href", "/en/cellar");
  });

  it("says nothing about the cellar when the visitor holds none", async () => {
    render(await view());

    expect(screen.queryByText(/In your cellar/)).not.toBeInTheDocument();
  });

  it("omits the city when the brewery has none", async () => {
    render(await view({ beer: { ...westvleteren12, brewery: { ...westvleteren12.brewery, city: undefined } } }));

    expect(screen.getByText("Brouwerij Westvleteren — Belgium")).toBeInTheDocument();
  });

  it("renders translated labels and a decimal comma in Finnish", async () => {
    const { container } = render(await view({ locale: "fi", heldBottles: 1 }));

    const terms = Array.from(container.querySelectorAll("dt")).map((term) => term.textContent);
    expect(terms).toEqual(["Tyyli", "Alkoholi", "Panimo", "Valmistettu"]);
    expect(screen.getByText("10,2 %")).toBeInTheDocument();
    expect(screen.getByText("Kellarissasi: 1 pullo")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
