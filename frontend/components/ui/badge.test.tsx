import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("renders the accent variant with its text, correct classes, and no a11y violations", async () => {
    const { container } = render(<Badge variant="accent">10.2 %</Badge>);

    expect(screen.getByText("10.2 %").className).toBe(badgeVariants("accent"));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("defaults to the neutral variant", () => {
    render(<Badge>Quadrupel</Badge>);

    expect(screen.getByText("Quadrupel").className).toBe(badgeVariants("neutral"));
  });

  it("merges a custom className with the accent variant", () => {
    render(
      <Badge variant="accent" className="extra">
        10.2 %
      </Badge>,
    );

    expect(screen.getByText("10.2 %").className).toBe(`${badgeVariants("accent")} extra`);
  });
});
