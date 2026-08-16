import { render, screen } from "@testing-library/react";
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
});
