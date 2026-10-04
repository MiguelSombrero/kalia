import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

// The actions are "use server" glue; what they do is covered by
// endSessionUrl.test.ts and by running the flow in a browser.
vi.mock("./actions", () => ({ startSignIn: vi.fn(), federatedSignOut: vi.fn() }));

import { AuthStatus } from "./AuthStatus";

describe("AuthStatus, signed out", () => {
  it("in the bar offers Sign in as a button and Create an account as a link", async () => {
    const { container } = render(await AuthStatus({ locale: "en", name: null, placement: "bar" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    // Carried to the sign-in action so Keycloak renders in this locale.
    expect(container.querySelector('input[name="locale"]')).toHaveValue("en");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("on a phone offers only Sign in, leaving Create an account to the menu", async () => {
    render(await AuthStatus({ locale: "en", name: null, placement: "phone" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("in the menu offers both, full width", async () => {
    const { container } = render(await AuthStatus({ locale: "fi", name: null, placement: "menu" }));

    expect(screen.getByRole("button", { name: "Kirjaudu sisään" })).toHaveClass("w-full");
    expect(screen.getByRole("link", { name: "Luo tili" })).toHaveAttribute("href", "/fi/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AuthStatus, signed in", () => {
  it("in the bar links the name to the profile and offers to sign out", async () => {
    const { container } = render(await AuthStatus({ locale: "en", name: "Ada Lovelace", placement: "bar" }));

    const profileLink = screen.getByRole("link", { name: "Profile: Ada Lovelace" });
    expect(profileLink).toHaveAttribute("href", "/en/profile");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("on a phone shows the person's slot as the profile link and no name", async () => {
    render(await AuthStatus({ locale: "en", name: "Ada Lovelace", placement: "phone" }));

    expect(screen.getByRole("link", { name: "Profile: Ada Lovelace" })).toHaveAttribute("href", "/en/profile");
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("in the menu offers only Sign out", async () => {
    render(await AuthStatus({ locale: "en", name: "Ada Lovelace", placement: "menu" }));

    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass("w-full");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
