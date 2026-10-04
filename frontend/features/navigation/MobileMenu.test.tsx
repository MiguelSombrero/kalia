import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MobileMenu, MobileMenuButton, MobileMenuPanel } from "./MobileMenu";

const renderMenu = () =>
  render(
    <MobileMenu>
      <MobileMenuButton />
      <MobileMenuPanel>
        <a href="#catalog">Catalog</a>
      </MobileMenuPanel>
    </MobileMenu>,
  );

const panelOf = (button: HTMLElement) => document.getElementById(button.getAttribute("aria-controls")!)!;

describe("MobileMenu", () => {
  it("starts closed, with the button naming what it will do", () => {
    renderMenu();

    const button = screen.getByRole("button", { name: "nav.menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panelOf(button)).toHaveClass("hidden");
  });

  it("opens on click and offers to close", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "nav.menu" }));

    const button = screen.getByRole("button", { name: "nav.closeMenu" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panelOf(button)).toHaveClass("flex");
    expect(panelOf(button)).not.toHaveClass("hidden");
  });

  it("closes on Escape and returns focus to the button", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "nav.menu" }));
    screen.getByRole("link", { name: "Catalog" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    const button = screen.getByRole("button", { name: "nav.menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes when a link inside it is followed", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "nav.menu" }));

    fireEvent.click(screen.getByRole("link", { name: "Catalog" }));

    expect(screen.getByRole("button", { name: "nav.menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("has no axe violations open or closed", async () => {
    const { container } = renderMenu();
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "nav.menu" }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("refuses to render its button outside a MobileMenu", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<MobileMenuButton />)).toThrow(/inside MobileMenu/);

    spy.mockRestore();
  });
});
