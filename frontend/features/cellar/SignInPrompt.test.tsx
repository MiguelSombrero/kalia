import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ startCellarSignIn: vi.fn() }));

import { startCellarSignIn } from "./actions";
import { SignInPrompt } from "./SignInPrompt";

describe("SignInPrompt", () => {
  it("invites the visitor to sign in instead of showing an error or empty cellar", async () => {
    const { container } = render(await SignInPrompt({ locale: "en" }));

    expect(screen.getByText("Sign in to see your cellar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish with no a11y violations", async () => {
    const { container } = render(await SignInPrompt({ locale: "fi" }));

    expect(screen.getByText("Kirjaudu sisään nähdäksesi kellarisi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirjaudu sisään" })).toBeInTheDocument();
    // Carried to the sign-in action so Keycloak renders in this locale.
    expect(container.querySelector('input[name="locale"]')).toHaveValue("fi");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("signs in through the cellar's own Server Action", async () => {
    render(await SignInPrompt({ locale: "en" }));

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(startCellarSignIn).toHaveBeenCalledTimes(1));
    expect(vi.mocked(startCellarSignIn).mock.calls[0][0]?.get("locale")).toBe("en");
  });
});
