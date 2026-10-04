import { act, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthSubmitButton } from "./AuthSubmitButton";

const button = (
  <form>
    <AuthSubmitButton className="w-full">Sign out</AuthSubmitButton>
  </form>
);

describe("AuthSubmitButton", () => {
  it("is disabled in the server-rendered markup", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(button);

    const rendered = container.querySelector("button");
    expect(rendered).toBeDisabled();
    expect(rendered).toHaveAttribute("type", "submit");
    expect(rendered).toHaveClass("w-full");
  });

  it("is enabled once hydration has committed", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(button);
    document.body.appendChild(container);

    const root = await act(async () => hydrateRoot(container, button));

    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    act(() => root.unmount());
    container.remove();
  });
});
