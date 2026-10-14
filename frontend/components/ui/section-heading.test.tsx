import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./section-heading";

describe("SectionHeading", () => {
  it("renders the heading look in the display face at --text-heading with no a11y violations", async () => {
    const { container } = render(
      <SectionHeading level={2} look="heading">
        Your cellar is empty
      </SectionHeading>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Your cellar is empty" });
    expect(heading.className).toBe("font-display text-heading font-bold text-foreground");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the label look in small tracked capitals", async () => {
    const { container } = render(
      <SectionHeading level={2} look="label">
        Latest in the cellars
      </SectionHeading>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Latest in the cellars" });
    expect(heading.className).toBe("text-label font-semibold uppercase text-foreground");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the level its caller passes", async () => {
    const { container } = render(
      <section>
        <h2>Section</h2>
        <SectionHeading level={3} look="label">
          Same style
        </SectionHeading>
      </section>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Same style" }).tagName).toBe("H3");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("appends a caller's className and passes other attributes through", () => {
    render(
      <SectionHeading level={2} look="label" id="feed-heading" className="flex min-h-11">
        Feed
      </SectionHeading>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Feed" });
    expect(heading.className).toBe("text-label font-semibold uppercase text-foreground flex min-h-11");
    expect(heading).toHaveAttribute("id", "feed-heading");
  });
});
