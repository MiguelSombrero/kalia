import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Page } from "./page";

describe("Page", () => {
  it("is the main landmark and the skip link's focusable target", () => {
    render(<Page>content</Page>);

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the skip link's id and tabindex whatever a caller passes", () => {
    render(<Page id="elsewhere" tabIndex={0}>content</Page>);

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("holds its children in a column of the width it is given", () => {
    render(
      <Page width="narrow">
        <h1>Title</h1>
      </Page>,
    );

    expect(screen.getByRole("heading", { name: "Title" }).parentElement).toHaveClass("max-w-md");
  });

  it("defaults to the text width", () => {
    render(<Page>content</Page>);

    expect(screen.getByText("content")).toHaveClass("max-w-3xl");
  });

  it("is not a viewport tall, so a short page is no taller than its content", () => {
    render(<Page>content</Page>);

    expect(screen.getByRole("main").className).not.toMatch(/min-h-screen|h-screen/);
    expect(screen.getByRole("main")).toHaveClass("flex-1");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Page>
        <h1>Title</h1>
      </Page>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
