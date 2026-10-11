import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { markShapes } from "@/lib/kaliaMark";
import { KaliaMark } from "./kalia-mark";

describe("KaliaMark", () => {
  it("draws a bottle pouring beer into foam on a full tile, in the mark's own colours only", () => {
    const { container } = render(<KaliaMark />);

    const tile = container.querySelector("rect.fill-mark-tile");
    expect(tile).toHaveAttribute("width", "64");
    expect(tile).toHaveAttribute("height", "64");
    expect(container.querySelector("path.stroke-mark-bottle")).toHaveAttribute("transform");
    expect(container.querySelectorAll("path.fill-mark-beer")).toHaveLength(2);
    expect(container.querySelectorAll("circle.fill-mark-foam").length).toBeGreaterThan(0);

    const painted = [...container.querySelectorAll("rect, circle, path")];
    expect(painted).toHaveLength(markShapes.length);
    expect(painted.every((shape) => /\b(fill|stroke)-mark-/.test(shape.getAttribute("class") ?? ""))).toBe(true);
  });

  it("is hidden from assistive technology when it sits beside the wordmark", async () => {
    const { container } = render(
      <span>
        <KaliaMark />
        Kalia
      </span>,
    );

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("carries its accessible name when it stands alone", async () => {
    const { container } = render(<KaliaMark label="Kalia" />);

    expect(screen.getByRole("img", { name: "Kalia" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
