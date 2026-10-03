import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { PersonSlot } from "./person-slot";

describe("PersonSlot", () => {
  it("shows the person's initials in a square, hidden from assistive technology", async () => {
    const { container } = render(<PersonSlot username="mikko.virtanen" />);

    const slot = screen.getByText("MV");
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot.className).toContain("border-border");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is sized by the size prop and defaults to medium", () => {
    const { rerender } = render(<PersonSlot username="Aino" />);
    expect(screen.getByText("A").className).toContain("size-12");

    rerender(<PersonSlot username="Aino" size="lg" />);
    expect(screen.getByText("A").className).toContain("size-24");

    rerender(<PersonSlot username="Aino" size="sm" />);
    expect(screen.getByText("A").className).toContain("size-9");
  });

  it("merges a custom className", () => {
    render(<PersonSlot username="Aino" className="extra" />);

    expect(screen.getByText("A").className).toContain("extra");
  });
});
