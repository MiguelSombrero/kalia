import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerListSkeleton } from "./BeerListSkeleton";

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
});
