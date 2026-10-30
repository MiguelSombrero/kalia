import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

// The action is "use server" glue; what it does is covered by actions.test.ts
// and by running the flow in a browser.
vi.mock("./actions", () => ({ startSignUp: vi.fn() }));

import { SignUpForm } from "./SignUpForm";

describe("SignUpForm", () => {
  it("carries the locale and requires the acknowledgement checkbox", async () => {
    const { container } = render(await SignUpForm({ locale: "en" }));

    expect(screen.getByRole("checkbox", { name: /old enough/i })).toBeRequired();
    expect(screen.getByRole("button", { name: "Continue to sign-up" })).toBeInTheDocument();
    expect(container.querySelector('input[name="locale"][value="en"]')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("puts the agreement error on the checkbox it is about", async () => {
    const { container } = render(await SignUpForm({ locale: "en", error: "agree-required" }));

    const box = screen.getByRole("checkbox", { name: /old enough/i });
    expect(box).toBeInvalid();
    expect(box).toHaveAccessibleDescription("Please confirm you're old enough to use a beer app.");
    expect(screen.getByRole("alert")).toHaveTextContent("old enough");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the rate-limit error as a box above the button, with the checkbox left valid", async () => {
    const { container } = render(await SignUpForm({ locale: "en", error: "rate-limited" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Too many sign-up attempts");
    expect(alert.compareDocumentPosition(screen.getByRole("button"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("checkbox")).not.toBeInvalid();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish", async () => {
    render(await SignUpForm({ locale: "fi" }));

    expect(screen.getByRole("button", { name: "Jatka rekisteröitymiseen" })).toBeInTheDocument();
  });
});
