import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("links to the same page in the other locale, preserving the path", async () => {
    usePathname.mockReturnValue("/en/beers/abc-123");
    const { container } = render(<LocaleSwitcher locale="en" />);

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/en/beers/abc-123",
    );
    expect(screen.getByRole("link", { name: "Suomi" })).toHaveAttribute(
      "href",
      "/fi/beers/abc-123",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("marks the prop locale as current, regardless of the pathname", () => {
    usePathname.mockReturnValue("/fi/beers");
    render(<LocaleSwitcher locale="en" />);

    const english = screen.getByRole("link", { name: "English" });
    expect(english).toHaveAttribute("aria-current", "page");
    expect(english).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: "Suomi" })).not.toHaveAttribute("aria-current");
  });

  it("replaces the first segment when it is a known locale", () => {
    usePathname.mockReturnValue("/fi/beers");
    render(<LocaleSwitcher locale="en" />);

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/beers");
  });

  it("prepends the locale when the first segment is not a known locale", () => {
    usePathname.mockReturnValue("/beers");
    render(<LocaleSwitcher locale="en" />);

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/beers");
    expect(screen.getByRole("link", { name: "Suomi" })).toHaveAttribute("href", "/fi/beers");
  });
});
