import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));

import { PublicCellarView } from "./PublicCellarView";
import type { PublicCellarBeer } from "./types";

const westvleteren: PublicCellarBeer = {
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
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
};

describe("PublicCellarView", () => {
  it("lists the cellar's beers for a visitor, with no owner banner", async () => {
    const { container } = render(
      await PublicCellarView({ locale: "en", beers: [westvleteren], isOwner: false }),
    );

    expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toBeInTheDocument();
    expect(screen.queryByText("This is how others see your cellar.")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the owner a banner linking back to their own cellar", async () => {
    render(await PublicCellarView({ locale: "en", beers: [westvleteren], isOwner: true }));

    expect(screen.getByText("This is how others see your cellar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to your cellar" })).toHaveAttribute(
      "href",
      "/en/cellar",
    );
  });

  it("renders the empty state for a public cellar with nothing in it", async () => {
    const { container } = render(
      await PublicCellarView({ locale: "en", beers: [], isOwner: false }),
    );

    expect(screen.getByText("This cellar is empty.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the Finnish empty state with no a11y violations", async () => {
    const { container } = render(
      await PublicCellarView({ locale: "fi", beers: [], isOwner: false }),
    );

    expect(screen.getByText("Tämä kellari on tyhjä.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing the public response does not carry — no price, no description", async () => {
    render(await PublicCellarView({ locale: "en", beers: [westvleteren], isOwner: false }));

    expect(screen.queryByText(/€|EUR|1250/)).not.toBeInTheDocument();
  });
});
