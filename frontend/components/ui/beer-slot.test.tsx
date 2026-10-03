import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { BeerSlot } from "./beer-slot";

describe("BeerSlot", () => {
  it("draws a band with the ABV figure on the beer's style colour, hidden from assistive technology", async () => {
    const { container } = render(<BeerSlot variant="band" beerStyle="Imperial Stout" abv={12} />);

    const band = container.firstElementChild as HTMLElement;
    expect(band).toHaveAttribute("data-beer-style", "stout");
    expect(band).toHaveAttribute("aria-hidden", "true");
    expect(band.className).toContain("bg-style text-style-foreground");
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("falls back to the neutral group when the band knows a strength but no style", () => {
    const { container } = render(<BeerSlot variant="band" abv={4.7} />);

    expect(container.firstElementChild).toHaveAttribute("data-beer-style", "other");
  });

  it("draws nothing for a band when the strength is unknown, as in the feed", () => {
    const { container } = render(<BeerSlot variant="band" beerStyle="IPA" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("draws a strip of the style colour for a list row", async () => {
    const { container } = render(<BeerSlot variant="strip" beerStyle="Double IPA" />);

    const strip = container.firstElementChild as HTMLElement;
    expect(strip).toHaveAttribute("data-beer-style", "ipa");
    expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(strip.className).toContain("bg-style");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("draws nothing for a strip when the style is unknown", () => {
    const { container } = render(<BeerSlot variant="strip" abv={5} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("merges a custom className", () => {
    const { container } = render(<BeerSlot variant="strip" beerStyle="Porter" className="extra" />);

    expect(container.firstElementChild?.className).toContain("extra");
  });
});
