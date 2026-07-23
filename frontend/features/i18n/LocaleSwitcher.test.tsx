import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("links to the same page in the other locale, preserving the path", async () => {
    usePathname.mockReturnValue("/en/beers/abc-123");
    const { container } = render(<LocaleSwitcher />);

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

  it("marks the current locale with aria-current", () => {
    usePathname.mockReturnValue("/fi/beers");
    render(<LocaleSwitcher />);

    expect(screen.getByRole("link", { name: "Suomi" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).not.toHaveAttribute("aria-current");
  });
});
