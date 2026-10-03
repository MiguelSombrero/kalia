import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { KaliaMark } from "./kalia-mark";

describe("KaliaMark", () => {
  it("draws nine cells of the rack, one of them in the action colour", () => {
    const { container } = render(<KaliaMark />);

    const cells = container.querySelectorAll("rect");
    expect(cells).toHaveLength(9);
    expect(container.querySelectorAll("rect.fill-primary")).toHaveLength(1);
    expect(container.querySelectorAll("rect.fill-foreground")).toHaveLength(8);
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
