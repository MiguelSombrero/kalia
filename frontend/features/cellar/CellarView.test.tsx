import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./actions", () => ({}));
vi.mock("./bottleDateRules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bottleDateRules")>()),
  todayIso: () => "2026-10-09",
}));

import { CellarView } from "./CellarView";
import { useBottleRemovalStore } from "./store";
import type { CellarBeer } from "./types";

const westvleteren: CellarBeer = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottles: [
    { id: "w1", entryId: "e1", containerType: "BOTTLE", bestBeforeDate: "2024-10-04", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    { id: "w2", entryId: "e1", containerType: "BOTTLE", bestBeforeDate: "2026-10-09", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  ],
};

const renderView = async (beers: CellarBeer[], visibility: { username: string; cellarPublic: boolean } | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {await CellarView({ locale: "en", beers, visibility })}
    </QueryClientProvider>,
  );

describe("CellarView", () => {
  it("heads the cellar with its counts and the bottles past their best-before, with no a11y violations", async () => {
    const { container } = await renderView([westvleteren], { username: "ada", cellarPublic: true });

    expect(screen.getByRole("heading", { level: 1, name: "My cellar" })).toBeInTheDocument();
    expect(screen.getByText(/cellar\.count\.beers \{"count":1\}/)).toHaveTextContent('cellar.entry.bottleCount {"count":2}');
    // One bottle is past; the one on its best-before day is not counted.
    expect(screen.getByText('cellar.pastBestBefore {"count":1}')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("counts only the bottles still shown while a removal is in flight", async () => {
    useBottleRemovalStore.setState({ removing: [{ bottleId: "w1", entryId: "e1" }], outcome: null });
    try {
      await renderView([westvleteren], { username: "ada", cellarPublic: true });

      expect(screen.getByText(/cellar\.count\.beers \{"count":1\}/)).toHaveTextContent('cellar.entry.bottleCount {"count":1}');
      expect(screen.queryByText(/cellar\.pastBestBefore/)).not.toBeInTheDocument();
    } finally {
      useBottleRemovalStore.setState({ removing: [], outcome: null });
    }
  });

  it("says a public cellar is public and links to the share URL", async () => {
    await renderView([westvleteren], { username: "ada", cellarPublic: true });

    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View your public cellar" })).toHaveAttribute("href", "/cellars/ada");
  });

  it("says a private cellar is private and links to where that is changed", async () => {
    await renderView([westvleteren], { username: "ada", cellarPublic: false });

    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change on your profile" })).toHaveAttribute("href", "/en/profile");
  });

  it("leaves the visibility line out when the profile could not be read", async () => {
    await renderView([westvleteren], null);

    expect(screen.queryByText("Public")).not.toBeInTheDocument();
    expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });

  it("greets an empty cellar as a first run, with the steps and the way into the catalog", async () => {
    const { container } = await renderView([], { username: "ada", cellarPublic: false });

    expect(screen.getByRole("heading", { level: 2, name: "Your cellar is empty." })).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "1Find a beer in the catalog",
      "2Add your bottles, with dates if you know them",
      "3See which bottle to open first",
    ]);
    expect(screen.getByRole("link", { name: "Browse the catalog" })).toHaveAttribute("href", "/en/beers");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
