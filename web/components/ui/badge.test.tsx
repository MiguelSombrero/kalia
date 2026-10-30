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

  it("renders the style variant in whichever style colour its data-beer-style selects", async () => {
    const { container } = render(
      <Badge variant="style" data-beer-style="stout">
        Imperial Stout
      </Badge>,
    );

    const badge = screen.getByText("Imperial Stout");
    expect(badge.className).toBe(badgeVariants("style"));
    expect(badge.className).toContain("bg-style text-style-foreground");
    expect(badge).toHaveAttribute("data-beer-style", "stout");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the ink variant as white on ink, for a flag a reader must not miss", async () => {
    const { container } = render(<Badge variant="ink">Past best before</Badge>);

    expect(screen.getByText("Past best before").className).toContain("bg-foreground text-background");
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
