import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./actions", () => ({}));

import { PublicCellarView } from "./PublicCellarView";
import type { CellarBeer } from "./types";

const westvleteren: CellarBeer = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottles: [
    {
      id: "bottle-1",
      entryId: "e1",
      containerType: "BOTTLE",
      brewedDate: "2023-01-01",
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
    },
  ],
};

const withQueryClient = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

const renderView = async (props: { locale?: "en" | "fi"; beers?: CellarBeer[]; isOwner?: boolean }) =>
  render(
    withQueryClient(
      await PublicCellarView({
        locale: props.locale ?? "en",
        username: "olutharrastaja_88",
        beers: props.beers ?? [westvleteren],
        isOwner: props.isOwner ?? false,
      }),
    ),
  );

describe("PublicCellarView", () => {
  it("shows a stranger whose cellar it is, its beers, and what Kalia is, with no a11y violations", async () => {
    const { container } = await renderView({});

    expect(screen.getByRole("heading", { level: 1, name: "olutharrastaja_88's cellar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Westvleteren 12" })).toHaveAttribute("href", "/en/beers/b1");
    expect(screen.getByText("Kalia keeps track of the beers people own and how old each bottle is.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(screen.getByRole("link", { name: "Browse the catalog" })).toHaveAttribute("href", "/en/beers");
    expect(screen.queryByText("This is how others see your cellar.")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is the owner's page without its controls", async () => {
    await renderView({});

    expect(screen.queryByRole("button", { name: /editFor|removeFor|tileFor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "cellar.findBeers" })).not.toBeInTheDocument();
  });

  it("shows the owner a banner linking back to their own cellar, and no pitch for Kalia", async () => {
    await renderView({ isOwner: true });

    expect(screen.getByText("This is how others see your cellar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to your cellar" })).toHaveAttribute("href", "/en/cellar");
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("renders the empty state for a public cellar with nothing in it", async () => {
    const { container } = await renderView({ beers: [] });

    expect(screen.getByText("This cellar is empty.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the Finnish empty state with no a11y violations", async () => {
    const { container } = await renderView({ locale: "fi", beers: [] });

    expect(screen.getByText("Tämä kellari on tyhjä.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing the public response does not carry — no price, no description", async () => {
    await renderView({});

    expect(screen.queryByText(/€|EUR|1250/)).not.toBeInTheDocument();
  });
});
