import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));

import { CellarList } from "./CellarList";
import type { CellarBeerRow } from "./types";

const westvleteren: CellarBeerRow = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottleCount: 2,
};

const sahti: CellarBeerRow = {
  entryId: "e2",
  beerId: "b2",
  beerName: "Pihtiputaan Sahti",
  breweryName: "Pihtiputaan Käsityöpanimo",
  style: "Sahti",
  abv: 8,
  bottleCount: 1,
};

const renderWithQueryClient = (children: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);

describe("CellarList", () => {
  it("renders one row per beer", async () => {
    const { container } = renderWithQueryClient(
      await CellarList({ locale: "en", rows: [westvleteren, sahti] }),
    );

    expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pihtiputaan Sahti/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows an empty state when the cellar has nothing in it", async () => {
    // CellarList's own strings go through the real i18n/server.ts, not the
    // mocked react-i18next above (that mock only reaches BeerRow's client-side
    // useTranslation) — so this asserts the actual translated copy.
    const { container } = render(await CellarList({ locale: "en", rows: [] }));

    expect(screen.getByText("Your cellar is empty.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the Finnish empty state with no a11y violations", async () => {
    const { container } = render(await CellarList({ locale: "fi", rows: [] }));

    expect(screen.getByText("Kellarisi on tyhjä.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders one row per beer in Finnish with no a11y violations", async () => {
    const { container } = renderWithQueryClient(
      await CellarList({ locale: "fi", rows: [westvleteren, sahti] }),
    );

    expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
