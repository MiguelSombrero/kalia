import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FeedSkeleton } from "./FeedSkeleton";

describe("FeedSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await FeedSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading recent activity…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label with no a11y violations", async () => {
    const { container } = render(await FeedSkeleton({ locale: "fi" }));

    expect(
      screen.getByRole("status", { name: "Ladataan viimeaikaista toimintaa…" }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
