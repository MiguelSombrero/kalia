import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Card, cardVariants } from "./card";

describe("Card", () => {
  it("renders children inside the card chrome and merges extra classes", async () => {
    const { container } = render(<Card className="extra">content</Card>);

    const card = screen.getByText("content");
    expect(card).toBeInTheDocument();
    expect(card.className).toBe(`${cardVariants} p-4 extra`);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("cardVariants", () => {
  it("is a non-empty class string without a padding utility", () => {
    expect(cardVariants.length).toBeGreaterThan(0);
    expect(cardVariants).not.toMatch(/(^|\s)p-\d/);
  });
});
