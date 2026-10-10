import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));

const { search } = vi.hoisted(() => ({ search: { current: "" } }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search.current) }));

vi.mock("./actions", () => ({ addBottlesAction: vi.fn(), updateBottleAction: vi.fn(), removeBottleAction: vi.fn() }));

vi.mock("./bottleDateRules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bottleDateRules")>()),
  todayIso: () => "2026-10-09",
}));

import { CellarBeerList } from "./CellarBeerList";
import type { Bottle, CellarBeer } from "./types";

const bottle = (id: string, entryId: string, dates: Partial<Bottle> = {}): Bottle => ({
  id,
  entryId,
  containerType: "BOTTLE",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...dates,
});

const westvleteren: CellarBeer = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottles: [
    bottle("w1", "e1", { brewedDate: "2021-10-04", bestBeforeDate: "2024-10-04" }),
    bottle("w2", "e1", { brewedDate: "2023-10-03", bestBeforeDate: "2026-10-09" }),
    bottle("w3", "e1"),
  ],
};

const orval: CellarBeer = {
  entryId: "e2",
  beerId: "b2",
  beerName: "Orval",
  breweryName: "Brasserie d'Orval",
  style: "Belgian Pale Ale",
  abv: 6.2,
  bottles: [bottle("o1", "e2", { brewedDate: "2026-03-12" })],
};

const renderList = (owner: boolean, beers = [westvleteren, orval]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CellarBeerList locale="en" beers={beers} owner={owner} />
    </QueryClientProvider>,
  );

const beerNames = () => screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
const tilesOf = (beerName: string) =>
  within(screen.getByRole("list", { name: new RegExp(beerName) })).getAllByRole("listitem");

beforeEach(() => {
  search.current = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CellarBeerList", () => {
  it("shows every beer with every bottle, nothing folded away, and no a11y violations", async () => {
    const { container } = renderList(true);

    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute("href", "/en/beers/b1");
    // Three bottles plus the Add bottle tile.
    expect(tilesOf("Westvleteren 12")).toHaveLength(4);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("heads each tile with the bottle's number and vintage, saying so when the vintage is unknown", () => {
    renderList(false);

    const [first, , third] = tilesOf("Westvleteren 12");
    expect(first).toHaveTextContent("cellar.bottle.number");
    expect(first).toHaveTextContent("cellar.bottle.vintage 2021");
    expect(third).toHaveTextContent("cellar.bottle.vintageUnknown");
  });

  it("gives the owner a named Edit and Remove per bottle, an Add bottle tile per beer and the way to the catalog", () => {
    renderList(true);

    const firstTile = within(tilesOf("Westvleteren 12")[0]);
    expect(firstTile.getByRole("button", { name: /^cellar\.bottle\.editFor/ })).toHaveAccessibleName(
      /"beer":"Westvleteren 12"/,
    );
    expect(firstTile.getByRole("button", { name: /^cellar\.bottle\.removeFor/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^cellar\.add\.tileFor/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "cellar.findBeers" })).toHaveAttribute("href", "/en/beers");
  });

  it("shows a public cellar's bottles with none of the owner's controls", () => {
    renderList(false);

    expect(screen.queryByRole("button", { name: /editFor|removeFor|tileFor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "cellar.findBeers" })).not.toBeInTheDocument();
    expect(tilesOf("Westvleteren 12")).toHaveLength(3);
  });

  it("marks a bottle past its best-before and leaves one on its best-before day unmarked", () => {
    renderList(false);

    const [past, onTheDay] = tilesOf("Westvleteren 12");
    expect(past).toHaveTextContent("cellar.bottle.pastBestBefore");
    expect(onTheDay).not.toHaveTextContent("cellar.bottle.pastBestBefore");
  });

  it("orders beers by name when the URL names no sort", () => {
    renderList(false);

    expect(beerNames()).toEqual(["Orval", "Westvleteren 12"]);
  });

  it("orders beers by the sort the URL names", () => {
    search.current = "sort=bottles";
    renderList(false);

    expect(beerNames()).toEqual(["Westvleteren 12", "Orval"]);
    expect(screen.getByRole("combobox", { name: "cellar.sort.label" })).toHaveValue("bottles");
  });

  it("writes a new sort to the URL in place rather than navigating, keeping the rest of the query", () => {
    search.current = "from=feed";
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderList(false);

    const sort = screen.getByRole("combobox", { name: "cellar.sort.label" });
    sort.focus();
    expect(sort).toHaveFocus();
    fireEvent.change(sort, { target: { value: "abv" } });

    expect(replaceState).toHaveBeenCalledWith(null, "", "?from=feed&sort=abv");
  });

  it("offers every sort the cellar knows", () => {
    renderList(false);

    const options = within(screen.getByRole("combobox", { name: "cellar.sort.label" })).getAllByRole("option");
    expect(options.map((option) => option.getAttribute("value"))).toEqual(["name", "style", "abv", "bottles", "bestBefore"]);
  });
});
