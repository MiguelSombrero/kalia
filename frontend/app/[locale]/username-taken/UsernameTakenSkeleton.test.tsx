import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { UsernameTakenSkeleton } from "./UsernameTakenSkeleton";

describe("UsernameTakenSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await UsernameTakenSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading your profile…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label with no a11y violations", async () => {
    const { container } = render(await UsernameTakenSkeleton({ locale: "fi" }));

    expect(screen.getByRole("status", { name: "Ladataan profiilia…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
