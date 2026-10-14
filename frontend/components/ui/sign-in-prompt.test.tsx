import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { SignInPrompt } from "./sign-in-prompt";

const renderPrompt = (signInAction: (formData: FormData) => Promise<void> = async () => {}) =>
  render(
    <SignInPrompt
      title="Sign in to see your cellar"
      hint="Your cellar is yours alone."
      signInLabel="Sign in"
      signUpLabel="Create an account"
      signInAction={signInAction}
      locale="fi"
      headingLevel={2}
    />,
  );

describe("SignInPrompt", () => {
  it("is an empty state with a sign-in button and a link to sign-up, with no a11y violations", async () => {
    const { container } = renderPrompt();

    expect(container.firstElementChild).toHaveClass("border-t", "border-border");
    expect(screen.getByRole("heading", { level: 2, name: "Sign in to see your cellar" })).toBeInTheDocument();
    expect(screen.getByText("Your cellar is yours alone.")).toHaveClass("text-muted-foreground");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/fi/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("signs in with the caller's Server Action, carrying the locale", async () => {
    const signInAction = vi.fn<(formData: FormData) => Promise<void>>(async () => {});
    renderPrompt(signInAction);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signInAction).toHaveBeenCalledTimes(1));
    expect(signInAction.mock.calls[0][0].get("locale")).toBe("fi");
  });
});
