import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, signIn: vi.fn() }));

import { AuthStatus } from "./AuthStatus";

describe("AuthStatus", () => {
  it("shows a sign-in button when there is no session", async () => {
    auth.mockResolvedValue(null);
    const { container } = render(await AuthStatus({ locale: "en" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("greets the signed-in user by name and offers to sign out", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace", email: "ada@example.com" } });
    const { container } = render(await AuthStatus({ locale: "en" }));

    expect(screen.getByText("Hi, Ada Lovelace")).toBeInTheDocument();
    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    expect(signOutButton.closest("form")).toHaveAttribute(
      "action",
      "/api/auth/federated-signout",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("falls back to email when the user has no name", async () => {
    auth.mockResolvedValue({ user: { name: null, email: "ada@example.com" } });
    render(await AuthStatus({ locale: "en" }));

    expect(screen.getByText("Hi, ada@example.com")).toBeInTheDocument();
  });
});
