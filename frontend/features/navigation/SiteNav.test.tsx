import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { SiteNav } from "./SiteNav";

describe("SiteNav", () => {
  it("links to Home, Catalog and Cellar for the current locale", () => {
    usePathname.mockReturnValue("/en");
    render(<SiteNav locale="en" />);

    expect(screen.getByRole("link", { name: "nav.home" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "nav.catalog" })).toHaveAttribute(
      "href",
      "/en/beers",
    );
    expect(screen.getByRole("link", { name: "nav.cellar" })).toHaveAttribute(
      "href",
      "/en/cellar",
    );
  });

  it("marks Home active only on the home page itself", () => {
    usePathname.mockReturnValue("/en");
    render(<SiteNav locale="en" />);

    expect(screen.getByRole("link", { name: "nav.home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "nav.catalog" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "nav.cellar" })).not.toHaveAttribute("aria-current");
  });

  it("marks Catalog active on a nested beer detail route", () => {
    usePathname.mockReturnValue("/en/beers/abc-123");
    render(<SiteNav locale="en" />);

    expect(screen.getByRole("link", { name: "nav.catalog" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "nav.home" })).not.toHaveAttribute("aria-current");
  });

  it("marks Cellar active on the cellar page", () => {
    usePathname.mockReturnValue("/fi/cellar");
    render(<SiteNav locale="fi" />);

    expect(screen.getByRole("link", { name: "nav.cellar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "nav.home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "nav.catalog" })).not.toHaveAttribute("aria-current");
  });

  it("has no axe violations", async () => {
    usePathname.mockReturnValue("/en/beers");
    const { container } = render(<SiteNav locale="en" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
