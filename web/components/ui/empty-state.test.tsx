import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders a ruled block: a section heading, a muted hint, content, then an action, with no a11y violations", async () => {
    const { container } = render(
      <EmptyState title="Your cellar is empty" headingLevel={2} hint="Add a beer to start." action={<button type="button">Browse</button>}>
        <ol>
          <li>Find a beer</li>
        </ol>
      </EmptyState>,
    );

    const block = container.firstElementChild!;
    expect(block.tagName).toBe("SECTION");
    expect(block).toHaveClass("border-t", "border-border");
    expect(block).not.toHaveClass("border-dashed");

    const heading = screen.getByRole("heading", { level: 2, name: "Your cellar is empty" });
    expect(heading).toHaveClass("font-display", "text-heading");
    expect(screen.getByText("Add a beer to start.")).toHaveClass("text-muted-foreground");
    expect(Array.from(block.children).map((child) => child.tagName)).toEqual(["H2", "P", "OL", "BUTTON"]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the heading level its caller passes", async () => {
    const { container } = render(
      <section>
        <h2>Results</h2>
        <EmptyState title="No beers match your search." headingLevel={3} hint="Try loosening a filter." />
      </section>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "No beers match your search." })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders only the heading and hint when given no content or action", () => {
    const { container } = render(<EmptyState title="Nothing here." headingLevel={2} hint="Come back later." />);

    expect(Array.from(container.firstElementChild!.children).map((child) => child.tagName)).toEqual(["H2", "P"]);
  });
});
