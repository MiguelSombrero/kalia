import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { beerRowFrame, beerRowSide, catalogColumns } from "@/features/catalog";
import { BEER_LIST_SKELETON_ROWS, BeerListSkeleton } from "./BeerListSkeleton";

describe("BeerListSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await BeerListSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading beers…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label", async () => {
    render(await BeerListSkeleton({ locale: "fi" }));

    expect(screen.getByRole("status", { name: "Ladataan oluita…" })).toBeInTheDocument();
  });

  it("lays the filters beside the results on the page's own columns", async () => {
    render(await BeerListSkeleton({ locale: "en" }));

    const [title, columns] = Array.from(screen.getByRole("status").children);
    expect(title.className).toContain("md:h-12");
    expect(columns.className).toBe(catalogColumns);
    const [filters, results] = Array.from(columns.children);
    expect(filters.lastElementChild?.className).toContain("h-10");
    expect(results.querySelector("ul")).not.toBeNull();
  });

  it("draws its rows on a result row's own frame: strip, two lines, strength and action", async () => {
    const { container } = render(await BeerListSkeleton({ locale: "en" }));

    const rows = container.querySelectorAll("li");
    expect(rows).toHaveLength(BEER_LIST_SKELETON_ROWS);
    for (const row of rows) {
      expect(row.className).toBe(beerRowFrame);
      const [strip, name, meta, side] = Array.from(row.children);
      expect(strip.className).toContain("w-1.5");
      expect(name.className).toContain("h-6");
      expect(meta.className).toContain("col-start-2");
      expect(side.className).toBe(beerRowSide);
      expect(side.children).toHaveLength(2);
    }
  });
});
