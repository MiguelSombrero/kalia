import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { detailsHead, factRow } from "@/features/catalog";
import { BEER_DETAILS_SKELETON_FACTS, BeerDetailsSkeleton } from "./BeerDetailsSkeleton";

describe("BeerDetailsSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await BeerDetailsSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading beers…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label", async () => {
    render(await BeerDetailsSkeleton({ locale: "fi" }));

    expect(screen.getByRole("status", { name: "Ladataan oluita…" })).toBeInTheDocument();
  });

  it("draws the back button, then the title block beside the style band on the page's own grid", async () => {
    render(await BeerDetailsSkeleton({ locale: "en" }));

    const [back, article] = Array.from(screen.getByRole("status").children);
    expect(back.className).toContain("h-10");
    const head = article.firstElementChild!;
    expect(head.className).toBe(detailsHead);
    expect(head.lastElementChild?.className).toContain("aspect-[16/7]");
  });

  it("draws one ruled row per fact the page lists", async () => {
    render(await BeerDetailsSkeleton({ locale: "en" }));

    const facts = screen.getByRole("status").lastElementChild!.lastElementChild!;
    expect(facts.children).toHaveLength(BEER_DETAILS_SKELETON_FACTS);
    for (const fact of facts.children) {
      expect(fact.className).toBe(factRow);
    }
  });
});
