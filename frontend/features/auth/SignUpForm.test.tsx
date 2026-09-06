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

  it("shows the agreement error", async () => {
    render(await SignUpForm({ locale: "en", error: "agree-required" }));

    expect(screen.getByRole("alert")).toHaveTextContent("old enough");
  });

  it("shows the rate-limit error", async () => {
    render(await SignUpForm({ locale: "en", error: "rate-limited" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Too many sign-up attempts");
  });

  it("renders in Finnish", async () => {
    render(await SignUpForm({ locale: "fi" }));

    expect(screen.getByRole("button", { name: "Jatka rekisteröitymiseen" })).toBeInTheDocument();
  });
});
