import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerDetailsSkeleton } from "./BeerDetailsSkeleton";

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
});
