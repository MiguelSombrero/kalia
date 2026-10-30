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
import type { CellarBeer, PublicCellar } from "./types";

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

const renderView = async (props: {
  locale?: "en" | "fi";
  beers?: CellarBeer[];
  isOwner?: boolean;
  cellar?: Partial<PublicCellar>;
}) => {
  const beers = props.beers ?? [westvleteren];
  return render(
    withQueryClient(
      await PublicCellarView({
        locale: props.locale ?? "en",
        cellar: {
          username: "olutharrastaja_88",
          beers,
          page: 0,
          totalPages: 1,
          totalBeers: beers.length,
          totalBottles: beers.flatMap((beer) => beer.bottles).length,
          ...props.cellar,
        },
        isOwner: props.isOwner ?? false,
      }),
    ),
  );
};

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

    expect(screen.getByRole("heading", { level: 2, name: "This cellar is empty." })).toBeInTheDocument();
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

  describe("a cellar of more than one page", () => {
    const paged = { page: 1, totalPages: 3, totalBeers: 55, totalBottles: 130 };

    it("counts the whole cellar, not the page, and leaves out the past-best-before count", async () => {
      await renderView({ cellar: paged });

      expect(screen.getByText(/cellar.count.beers {"count":55} · cellar.entry.bottleCount {"count":130}/)).toBeInTheDocument();
      expect(screen.queryByText(/cellar.pastBestBefore/)).not.toBeInTheDocument();
    });

    it("links to the neighbouring pages with plain anchors", async () => {
      await renderView({ cellar: paged });

      expect(screen.getByRole("navigation", { name: "Pages of this cellar" })).toBeInTheDocument();
      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "← Previous" })).toHaveAttribute("href", "/en/cellars/olutharrastaja_88");
      expect(screen.getByRole("link", { name: "Next →" })).toHaveAttribute(
        "href",
        "/en/cellars/olutharrastaja_88?page=2",
      );
    });

    it("offers no Sort by, which would order only this page", async () => {
      await renderView({ cellar: paged });

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("offers no Next on the last page and no Previous on the first", async () => {
      const last = await renderView({ cellar: { ...paged, page: 2 } });
      expect(screen.queryByRole("link", { name: "Next →" })).not.toBeInTheDocument();
      last.unmount();

      await renderView({ cellar: { ...paged, page: 0 } });
      expect(screen.queryByRole("link", { name: "← Previous" })).not.toBeInTheDocument();
    });

    it("never links past the last page the backend serves", async () => {
      await renderView({ cellar: { page: 199, totalPages: 300, totalBeers: 6000, totalBottles: 6000 } });

      expect(screen.getByText("Page 200 of 200")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Next →" })).not.toBeInTheDocument();
    });
  });

  it("counts a cellar that fits one page from what it lists", async () => {
    await renderView({ cellar: { totalBeers: 9, totalBottles: 9 } });

    expect(screen.getByText(/cellar.count.beers {"count":1} · cellar.entry.bottleCount {"count":1}/)).toBeInTheDocument();
  });

  it("keeps Sort by and shows no pagination for a cellar that fits one page", async () => {
    await renderView({});

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages of this cellar" })).not.toBeInTheDocument();
  });

  it("says when a beer lists fewer bottles than the cellar holds, and counts the held ones", async () => {
    await renderView({ beers: [{ ...westvleteren, unlistedBottles: 23 }] });

    expect(screen.getByText('cellar.entry.listed {"count":1}')).toBeInTheDocument();
    expect(screen.getByText('cellar.entry.bottleCount {"count":24}')).toBeInTheDocument();
  });
});
