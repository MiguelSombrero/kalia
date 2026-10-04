import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { expect, signIn, test } from "./support/keycloakAccount";
import { expectShellTargetsReachable } from "./support/shell";

test.use({ screenshot: "off", trace: "off", video: "off" });

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const SHORT_PAGES = [
  "/en/no-such-page",
  "/en/beers/00000000-0000-0000-0000-000000000000",
  "/en/cellars/no-such-cellar-here",
  "/en/cellar",
] as const;

const MAIN_NAV = { en: "Main navigation", fi: "Päänavigaatio" } as const;

const pressTabUntilFocused = async (page: Page, target: ReturnType<Page["locator"]>) => {
  await expect(async () => {
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused({ timeout: 200 });
  }).toPass({ timeout: 5_000 });
};

for (const viewport of VIEWPORTS) {
  test.describe(`page shell, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("the skip link moves focus to the main content", async ({ page }) => {
      await page.goto("/en");
      // While a page streams, its loading fallback's <main> and the page's own
      // coexist for a moment; the skip link has one target only once they don't.
      await expect(page.locator("main#main-content")).toHaveCount(1);

      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(page.locator("main#main-content")).toBeFocused();
      await expect(page.locator("main#main-content")).toHaveCSS("outline-style", "none");
    });

    for (const path of SHORT_PAGES) {
      test(`${path} is no taller than its content, and the footer closes it`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();

        const { scrollHeight, innerHeight } = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
        }));
        expect(scrollHeight, "the page scrolls though it holds almost nothing").toBeLessThanOrEqual(innerHeight);

        const footer = await page.getByRole("contentinfo").boundingBox();
        expect(footer, "the footer is missing").not.toBeNull();
        expect(Math.abs(footer!.y + footer!.height - innerHeight)).toBeLessThanOrEqual(1);
      });
    }

    test("a URL that matches no route is a Kalia page with the header and footer", async ({ page }) => {
      await page.goto("/en/no-such-page");

      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", "noindex");
      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    });

    for (const locale of ["en", "fi"] as const) {
      test(`the header is one row in ${locale} and nothing scrolls sideways`, async ({ page }) => {
        await page.goto(`/${locale}`);

        const header = await page.getByRole("banner").boundingBox();
        expect(header!.height, "the header wrapped").toBeLessThanOrEqual(58);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test("every control in the header and footer is at least 24×24 CSS pixels", async ({ page }) => {
      await page.goto("/en");
      await expectShellTargetsReachable(page);

      await page.goto("/fi");
      await expectShellTargetsReachable(page);
    });

    test("passes an axe scan with the shell around it", async ({ page }) => {
      await page.goto("/en");
      await expectNoA11yViolations(page);
    });

    if (viewport.name === "phone") {
      test("the menu opens, is operable and closes with the keyboard alone", async ({ page }) => {
        await page.goto("/en");
        const menuButton = page.getByRole("button", { name: "Menu" });
        const nav = page.getByRole("navigation", { name: MAIN_NAV.en });
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(nav).toBeHidden();

        await pressTabUntilFocused(page, menuButton);
        await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
        await expect(nav).toBeVisible();
        await expectNoA11yViolations(page);
        await expectShellTargetsReachable(page);

        await page.keyboard.press("Tab");
        await expect(nav.getByRole("link", { name: "Home" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(menuButton).toBeFocused();

        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await expect(nav.getByRole("link", { name: "Catalog" })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/en\/beers$/);
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
      });

      test("an open menu taller than the window scrolls inside itself, so nothing in it is out of reach", async ({ page }) => {
        await page.setViewportSize({ width: 667, height: 375 });
        await page.goto("/en");
        await page.getByRole("button", { name: "Menu" }).click();

        const panel = page.locator("#" + (await page.getByRole("button", { name: "Close menu" }).getAttribute("aria-controls")));
        const { bottom, overflowY, scrollHeight, clientHeight } = await panel.evaluate((element) => ({
          bottom: element.getBoundingClientRect().bottom,
          overflowY: getComputedStyle(element).overflowY,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        }));
        expect(bottom).toBeLessThanOrEqual(375);
        expect(overflowY).toBe("auto");
        expect(scrollHeight).toBeGreaterThan(clientHeight);

        await page.getByRole("link", { name: "Suomi" }).scrollIntoViewIfNeeded();
        await expect(page.getByRole("link", { name: "Suomi" })).toBeInViewport();
      });

      test("the menu holds Create an account and the language switch", async ({ page }) => {
        await page.goto("/en");
        await expect(page.getByRole("link", { name: "Create an account" })).toBeHidden();

        await page.getByRole("button", { name: "Menu" }).click();
        await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
        await page.getByRole("link", { name: "Suomi" }).click();

        await expect(page).toHaveURL(/\/fi$/);
        await expect(page.getByRole("button", { name: "Valikko" })).toBeVisible();
      });
    } else {
      test("the destinations, Sign in and Create an account sit in the bar with no menu button", async ({ page }) => {
        await page.goto("/en");

        await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
        await expect(page.getByRole("navigation", { name: MAIN_NAV.en }).getByRole("link")).toHaveCount(3);
        await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
      });
    }

    test("the wordmark takes the visitor home from anywhere", async ({ page }) => {
      await page.goto("/en/beers");

      await page.getByRole("banner").getByRole("link", { name: "Kalia, Home" }).click();

      await expect(page).toHaveURL(/\/en$/);
    });

    test("a signed-in visitor can reach their profile and sign out", async ({ page, account }) => {
      await page.goto("/en");
      await signIn(page, account);
      await expectShellTargetsReachable(page);

      if (viewport.name === "phone") {
        await expect(page.getByRole("button", { name: "Sign out" })).toBeHidden();
        await page.getByRole("button", { name: "Menu" }).click();
      }
      await page.getByRole("button", { name: "Sign out" }).click();

      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });
  });
}
