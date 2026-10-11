import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ErrorAlert } from "./error-alert";

describe("ErrorAlert", () => {
  it("announces the message, with the toast's red cell hidden from assistive technology", async () => {
    const { container } = render(<ErrorAlert>Could not add to your cellar. Please try again.</ErrorAlert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not add to your cellar. Please try again.");
    const cell = container.querySelector('[role="alert"] > span');
    expect(cell).toHaveAttribute("aria-hidden", "true");
    expect(cell?.className).toContain("bg-destructive");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sets a recovery action beside the message", async () => {
    const { container } = render(
      <ErrorAlert action={<button type="button">Try again</button>}>{"Couldn't load recent activity."}</ErrorAlert>,
    );

    expect(screen.getByRole("alert")).toContainElement(screen.getByRole("button", { name: "Try again" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
