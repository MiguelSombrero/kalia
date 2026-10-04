import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/features/auth", () => ({
  AuthStatus: ({ name, placement }: { name: string | null; placement: string }) => (
    <div data-testid={`auth-${placement}`}>{name === null ? "signed-out" : name}</div>
  ),
}));
vi.mock("@/features/navigation", async () => ({
  ...(await vi.importActual<object>("@/features/navigation/index")),
  SiteBrand: () => <a href="#brand">brand</a>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/en/beers" }));

import { SiteHeader } from "./SiteHeader";

beforeEach(() => {
  auth.mockReset();
  auth.mockResolvedValue(null);
});

// No axe scan here: jsdom has no stylesheet, so the bar's and the menu's
// landmarks are both visible at once, which they never are in a browser. The
// Playwright scans at both widths (e2e/shell.spec.ts) are the check on that.
describe("SiteHeader", () => {
  it("is a banner holding the brand, the navigation, the account actions and the language switch", async () => {
    render(await SiteHeader({ locale: "en" }));

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "brand" })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "nav.label" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "English" }).length).toBeGreaterThan(0);
  });

  it("hands the same signed-in name to the bar, the phone bar and the menu", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace", email: "ada@example.com" } });
    render(await SiteHeader({ locale: "en" }));

    for (const placement of ["bar", "phone", "menu"]) {
      expect(screen.getByTestId(`auth-${placement}`)).toHaveTextContent("Ada Lovelace");
    }
  });

  it("falls back to the email when the visitor has no name", async () => {
    auth.mockResolvedValue({ user: { name: null, email: "ada@example.com" } });
    render(await SiteHeader({ locale: "en" }));

    expect(screen.getByTestId("auth-bar")).toHaveTextContent("ada@example.com");
  });

  it("passes no name when nobody is signed in", async () => {
    render(await SiteHeader({ locale: "en" }));

    expect(screen.getByTestId("auth-bar")).toHaveTextContent("signed-out");
  });

  it("reads the session once however many places the account actions appear", async () => {
    await SiteHeader({ locale: "en" });

    expect(auth).toHaveBeenCalledTimes(1);
  });
});
