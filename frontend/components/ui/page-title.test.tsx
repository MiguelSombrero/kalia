import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { PageTitle } from "./page-title";

describe("PageTitle", () => {
  it("renders an h1 at the page title's sizes with no a11y violations", async () => {
    const { container } = render(<PageTitle>Beers</PageTitle>);

    const title = screen.getByRole("heading", { level: 1, name: "Beers" });
    expect(title.className).toBe(
      "font-display text-title text-foreground font-extrabold text-balance md:text-display",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the name size at the profile's username sizes", async () => {
    const { container } = render(<PageTitle size="name">hopfan</PageTitle>);

    const title = screen.getByRole("heading", { level: 1, name: "hopfan" });
    expect(title.className).toBe("font-display text-title text-foreground font-bold md:text-name");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("appends a caller's className and passes other attributes through", () => {
    render(
      <PageTitle className="sr-only" id="page-title">
        Kalia
      </PageTitle>,
    );

    const title = screen.getByRole("heading", { level: 1, name: "Kalia" });
    expect(title.className.endsWith(" sr-only")).toBe(true);
    expect(title).toHaveAttribute("id", "page-title");
  });
});
