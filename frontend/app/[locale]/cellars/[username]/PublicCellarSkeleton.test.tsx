import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { PublicCellarSkeleton } from "./PublicCellarSkeleton";

describe("PublicCellarSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await PublicCellarSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading this cellar…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label with no a11y violations", async () => {
    const { container } = render(await PublicCellarSkeleton({ locale: "fi" }));

    expect(screen.getByRole("status", { name: "Ladataan kellaria…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
