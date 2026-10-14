import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ startProfileSignIn: vi.fn() }));

import { startProfileSignIn } from "./actions";
import { SignInPrompt } from "./SignInPrompt";

describe("SignInPrompt", () => {
  it("invites the visitor to sign in, or to create an account if they have none", async () => {
    const { container } = render(await SignInPrompt({ locale: "en" }));

    expect(screen.getByRole("heading", { name: "Sign in to see your profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish with no a11y violations", async () => {
    const { container } = render(await SignInPrompt({ locale: "fi" }));

    expect(screen.getByRole("heading", { name: "Kirjaudu sisään nähdäksesi profiilisi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirjaudu sisään" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Luo tili" })).toHaveAttribute("href", "/fi/sign-up");
    // Carried to the sign-in action so Keycloak renders in this locale.
    expect(container.querySelector('input[name="locale"]')).toHaveValue("fi");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("signs in through the profile's own Server Action", async () => {
    render(await SignInPrompt({ locale: "en" }));

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(startProfileSignIn).toHaveBeenCalled());
    expect(vi.mocked(startProfileSignIn).mock.lastCall?.[0]?.get("locale")).toBe("en");
  });
});
