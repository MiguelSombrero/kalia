import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, currentAccessToken, navProps, readUnreadCount } = vi.hoisted(() => ({
  auth: vi.fn(),
  currentAccessToken: vi.fn(),
  navProps: [] as Record<string, unknown>[],
  readUnreadCount: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/api/accessToken", () => ({ currentAccessToken }));
vi.mock("@/features/auth", () => ({
  AuthStatus: ({ name, placement }: { name: string | null; placement: string }) => (
    <div data-testid={`auth-${placement}`}>{name === null ? "signed-out" : name}</div>
  ),
}));
vi.mock("@/features/navigation", async () => {
  const actual = await vi.importActual<typeof import("@/features/navigation")>("@/features/navigation/index");
  return {
    ...actual,
    SiteBrand: () => <a href="#brand">brand</a>,
    // Records what the server hands the client component, then renders the real one.
    SiteNav: (props: React.ComponentProps<typeof actual.SiteNav>) => {
      navProps.push(props);
      return <actual.SiteNav {...props} />;
    },
  };
});
vi.mock("@/features/notifications", () => ({
  readUnreadCount,
  NotificationsTray: ({ count }: { count: number }) => <div data-testid="tray">{count}</div>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/en/beers", useSearchParams: () => new URLSearchParams() }));

import { SiteHeader } from "./SiteHeader";

// An unsigned JWT: the header only decodes the payload, as the web does for the
// session id.
const accessTokenWith = (claims: Record<string, unknown>) => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part(claims)}.signature`;
};

beforeEach(() => {
  auth.mockReset();
  auth.mockResolvedValue(null);
  currentAccessToken.mockReset();
  currentAccessToken.mockResolvedValue(undefined);
  navProps.length = 0;
  readUnreadCount.mockReset();
  readUnreadCount.mockResolvedValue(0);
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
    expect(screen.getAllByRole("link", { name: "EN English" }).length).toBeGreaterThan(0);
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

  describe("the unread notifications signal", () => {
    const signedIn = () => auth.mockResolvedValue({ user: { name: "Ada", email: "ada@example.com" } });

    it("hands the signed-in viewer's unread count to the tray, read once on the server", async () => {
      signedIn();
      readUnreadCount.mockResolvedValue(3);
      render(await SiteHeader({ locale: "en" }));

      expect(screen.getByTestId("tray")).toHaveTextContent("3");
      expect(readUnreadCount).toHaveBeenCalledTimes(1);
    });

    it("reads nothing and shows nothing to a signed-out visitor", async () => {
      render(await SiteHeader({ locale: "en" }));

      expect(readUnreadCount).not.toHaveBeenCalled();
      expect(screen.queryByTestId("tray")).not.toBeInTheDocument();
    });

    it("draws the bar without a signal when the count cannot be read, rather than failing the page", async () => {
      signedIn();
      readUnreadCount.mockRejectedValue(new Error("backend down"));
      render(await SiteHeader({ locale: "en" }));

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByTestId("tray")).toHaveTextContent("0");
    });
  });

  describe("the admin entry in the navigation", () => {
    const signedInWith = (token: string | undefined) => {
      auth.mockResolvedValue({ user: { name: "Ada", email: "ada@example.com" } });
      currentAccessToken.mockResolvedValue(token);
    };

    it("shows Admin, linking to the admin area with no count, in the bar and the menu, to an admin", async () => {
      signedInWith(accessTokenWith({ realm_access: { roles: ["default-roles-kalia", "admin"] } }));
      render(await SiteHeader({ locale: "fi" }));

      const links = screen.getAllByRole("link", { name: "nav.admin" });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute("href", "/fi/admin");
        expect(link).toHaveTextContent(/^nav\.admin$/);
      }
    });

    it.each([
      ["a signed-out visitor", () => undefined],
      ["a signed-in non-admin", () => accessTokenWith({ realm_access: { roles: ["default-roles-kalia"] } })],
      ["a session with no role claim", () => accessTokenWith({ sub: "user-1" })],
    ])("shows no Admin entry to %s", async (_name, token) => {
      signedInWith(token());
      render(await SiteHeader({ locale: "en" }));

      expect(screen.queryByRole("link", { name: "nav.admin" })).not.toBeInTheDocument();
    });

    it("hands the browser a boolean and never the token", async () => {
      const token = accessTokenWith({ realm_access: { roles: ["admin"] } });
      signedInWith(token);
      await SiteHeader({ locale: "en" }).then((header) => render(header));

      expect(navProps.length).toBeGreaterThan(0);
      for (const props of navProps) {
        expect(props.isAdmin).toBe(true);
        expect(JSON.stringify(props)).not.toContain(token);
        expect(JSON.stringify(props)).not.toContain("realm_access");
      }
    });
  });
});
