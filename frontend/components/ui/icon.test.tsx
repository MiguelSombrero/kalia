import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./icon";

const names: IconName[] = ["menu", "close", "search", "plus", "arrow", "back", "check"];

describe("Icon", () => {
  it.each(names)("draws the %s icon with currentColor and is hidden when it sits beside a word", async (name) => {
    const { container } = render(
      <button type="button">
        <Icon name={name} />
        Label
      </button>,
    );

    const svg = container.querySelector("svg");
    expect(svg?.querySelector("path, rect")).not.toBeNull();
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("carries an accessible name when it stands alone", async () => {
    const { container } = render(
      <button type="button">
        <Icon name="menu" label="Menu" />
      </button>,
    );

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("merges a custom className and passes through svg attributes", () => {
    const { container } = render(<Icon name="check" className="size-8" strokeWidth={3} />);

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("size-8");
    expect(svg).toHaveAttribute("stroke-width", "3");
  });
});
