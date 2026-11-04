import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { language } = vi.hoisted(() => ({ language: { current: "en" } }));

vi.mock("react-i18next", async () => {
  const { resources } = await import("@kalia/locales");
  const lookup = (key: string): string =>
    key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      resources[language.current as "en" | "fi"].common,
    ) as string;
  return { useTranslation: () => ({ t: (key: string) => lookup(key) ?? key }) };
});

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
vi.mock("./actions", () => ({ addBottlesAction: vi.fn(), updateBottleAction: vi.fn(), removeBottleAction: vi.fn() }));

import type { Locale } from "@/i18n/settings";
import { CellarBeerList } from "./CellarBeerList";
import type { CellarBeer } from "./types";

const bottle = { id: "w1", entryId: "e1", containerType: "BOTTLE" as const, createdAt: "", updatedAt: "" };

const beer = (overrides: Partial<CellarBeer>): CellarBeer => ({
  entryId: "e1",
  beerId: "b1",
  beerName: "Sahti",
  breweryName: "Panimo",
  style: "Sahti",
  abv: 8,
  bottles: [bottle],
  ...overrides,
});

const renderOwnersCellar = (beers: CellarBeer[], locale: Locale) => {
  language.current = locale;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CellarBeerList locale={locale} beers={beers} owner />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  language.current = "en";
});

describe("a withdrawn beer in the owner's cellar", () => {
  it.each([
    ["en" as const, "This beer was withdrawn from the catalog."],
    ["fi" as const, "Tämä olut on poistettu oluiden luettelosta."],
  ])("shows unlinked, with the withdrawn note, in %s", (locale, note) => {
    renderOwnersCellar([beer({ withdrawn: true })], locale);

    expect(screen.getByRole("heading", { level: 2, name: "Sahti" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sahti" })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${note}`))).toBeInTheDocument();
  });

  it("offers no way to add another bottle, while leaving the bottles removable", () => {
    renderOwnersCellar([beer({ withdrawn: true })], "en");

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("leaves a beer in the catalog linked, without the note", () => {
    renderOwnersCellar([beer({})], "en");

    expect(screen.getByRole("link", { name: "Sahti" })).toHaveAttribute("href", "/en/beers/b1");
    expect(screen.queryByText(/withdrawn from the catalog/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });
});
