import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders a title and description content with no a11y violations", async () => {
    const { container } = render(
      <EmptyState title="No beers match your search.">
        <span>Try loosening a filter.</span>
      </EmptyState>,
    );

    expect(screen.getByText("No beers match your search.")).toBeInTheDocument();
    expect(screen.getByText("Try loosening a filter.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders without a description when no children are passed", () => {
    render(<EmptyState title="Nothing here." />);

    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });
});
