import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ startCellarSignIn: vi.fn() }));

import { SignInPrompt } from "./SignInPrompt";

describe("SignInPrompt", () => {
  it("invites the visitor to sign in instead of showing an error or empty cellar", async () => {
    const { container } = render(await SignInPrompt({ locale: "en" }));

    expect(screen.getByText("Sign in to see your cellar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish with no a11y violations", async () => {
    const { container } = render(await SignInPrompt({ locale: "fi" }));

    expect(screen.getByText("Kirjaudu sisään nähdäksesi kellarisi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirjaudu sisään" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
