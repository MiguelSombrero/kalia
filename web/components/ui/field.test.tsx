import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FieldError, fieldClasses } from "./field";

describe("FieldError", () => {
  it("reads as the field's description, with its red square hidden from assistive technology", async () => {
    const { container } = render(
      <div>
        <label htmlFor="brewed">Brewed</label>
        <input id="brewed" className={fieldClasses} aria-invalid="true" aria-describedby="brewed-error" />
        <FieldError id="brewed-error">A brewed date cannot be in the future.</FieldError>
      </div>,
    );

    expect(screen.getByLabelText("Brewed")).toHaveAccessibleDescription("A brewed date cannot be in the future.");
    const square = container.querySelector("#brewed-error > span");
    expect(square).toHaveAttribute("aria-hidden", "true");
    expect(square?.className).toContain("bg-destructive");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the message itself in ink, never red", async () => {
    const { container } = render(<FieldError>Pick a date.</FieldError>);

    expect(screen.getByText("Pick a date.").closest("p")?.className).toContain("text-foreground");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("fieldClasses", () => {
  it("turns the edge red only for an invalid field", () => {
    expect(fieldClasses).toContain("border-border");
    expect(fieldClasses).toContain("aria-[invalid=true]:border-destructive");
  });
});
