import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a decorative, accessibility-hidden placeholder with merged classes", async () => {
    const { container } = render(<Skeleton data-testid="skeleton" className="h-4 w-32" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton.className).toBe("animate-pulse rounded-md bg-border/60 h-4 w-32");
    expect(await axe(container)).toHaveNoViolations();
  });
});
