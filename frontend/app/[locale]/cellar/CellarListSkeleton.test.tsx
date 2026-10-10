import { render, screen, within } from "@testing-library/react";
import { beerBlock } from "@/features/cellar";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { CellarListSkeleton } from "./CellarListSkeleton";

describe("CellarListSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await CellarListSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading your cellar…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label with no a11y violations", async () => {
    const { container } = render(await CellarListSkeleton({ locale: "fi" }));

    expect(screen.getByRole("status", { name: "Ladataan kellaria…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it("stands in for the cellar's shape: a sort control, then beers beside their band, each with bottle tiles", async () => {
    render(await CellarListSkeleton({ locale: "en" }));

    const beers = screen.getAllByTestId("beer-skeleton");
    expect(beers).toHaveLength(2);
    expect(beers[0].className).toBe(beerBlock);
    expect(within(beers[0]).getAllByTestId("tile-skeleton")).toHaveLength(3);
    expect(within(beers[1]).getAllByTestId("tile-skeleton")).toHaveLength(2);
  });
});
