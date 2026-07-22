import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("links to the same page in the other locale, preserving the path", () => {
    usePathname.mockReturnValue("/en/beers/abc-123");
    render(<LocaleSwitcher />);

    expect(screen.getByRole("link", { name: "EN" })).toHaveAttribute(
      "href",
      "/en/beers/abc-123",
    );
    expect(screen.getByRole("link", { name: "FI" })).toHaveAttribute(
      "href",
      "/fi/beers/abc-123",
    );
  });

  it("marks the current locale with aria-current", () => {
    usePathname.mockReturnValue("/fi/beers");
    render(<LocaleSwitcher />);

    expect(screen.getByRole("link", { name: "FI" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "EN" })).not.toHaveAttribute("aria-current");
  });
});
