import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { CellarBeerAccordion } from "./CellarBeerAccordion";

const baseProps = {
  title: "Westvleteren 12",
  subtitle: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  countLabel: "2 bottles",
};

describe("CellarBeerAccordion", () => {
  it("shows the beer summary with the panel hidden while collapsed", async () => {
    const { container } = render(
      <CellarBeerAccordion {...baseProps} expanded={false} onToggle={vi.fn()}>
        <p>panel body</p>
      </CellarBeerAccordion>,
    );

    const toggle = screen.getByRole("button", { name: /Westvleteren 12/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("panel body")).not.toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reveals the panel and flips aria-expanded when expanded", async () => {
    const { container } = render(
      <CellarBeerAccordion {...baseProps} expanded onToggle={vi.fn()}>
        <p>panel body</p>
      </CellarBeerAccordion>,
    );

    expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("panel body")).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("calls onToggle when the summary button is clicked", () => {
    const onToggle = vi.fn();
    render(
      <CellarBeerAccordion {...baseProps} expanded={false} onToggle={onToggle}>
        <p>panel body</p>
      </CellarBeerAccordion>,
    );

    screen.getByRole("button", { name: /Westvleteren 12/ }).click();
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
