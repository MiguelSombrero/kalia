// Exercises the whole stack through the edge (ADR-0090): the `admin` realm role
// reaching the web (ADR-0101).
import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { expect, signIn, test } from "./support/keycloakAccount";

const NAV_NAME = { en: "Main navigation", fi: "Päänavigaatio" } as const;
const ADMIN_LABEL = { en: "Admin", fi: "Ylläpito" } as const;
const NOT_FOUND_TITLE = { en: "Page not found", fi: "Sivua ei löytynyt" } as const;
const REVIEW_TITLE = { en: "Review suggestions", fi: "Ehdotusten tarkistus" } as const;

const locales = ["en", "fi"] as const;

const adminLink = (page: Page, locale: keyof typeof NAV_NAME) =>
  page.getByRole("navigation", { name: NAV_NAME[locale] }).getByRole("link", { name: ADMIN_LABEL[locale], exact: true });

const expectNotFound = async (page: Page, path: string, locale: keyof typeof NAV_NAME) => {
  const response = await page.goto(path);

  expect(response?.status(), `${path} status`).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: NOT_FOUND_TITLE[locale] })).toBeVisible();
  const body = (await response?.text()) ?? "";
  expect(body, `${path} body`).not.toContain(REVIEW_TITLE[locale]);
  await expect(adminLink(page, locale)).toHaveCount(0);
};

test.describe("the admin area", () => {
  for (const locale of locales) {
    test(`answers a signed-out visitor the not-found page, in ${locale}`, async ({ page }) => {
      await expectNotFound(page, `/${locale}/admin`, locale);
    });

    test(`answers a signed-in non-admin the not-found page, in ${locale}`, async ({ page, account }) => {
      await page.goto("/en");
      await signIn(page, account);

      await expectNotFound(page, `/${locale}/admin`, locale);
    });
  }

  test("takes no admin hint from the request: a cookie, a header or a query parameter", async ({
    page,
    context,
    account,
  }) => {
    await page.goto("/en");
    await signIn(page, account);
    await context.addCookies([{ name: "admin", value: "true", url: page.url() }]);
    await context.setExtraHTTPHeaders({ "x-admin": "true", "x-kalia-role": "admin" });

    await expectNotFound(page, "/en/admin?admin=true&role=admin", "en");
  });

  test("shows an admin the entry and the page, in both locales", async ({ page, adminAccount }) => {
    await page.goto("/en");
    await expect(adminLink(page, "en")).toHaveCount(0);

    await signIn(page, adminAccount);
    const entry = adminLink(page, "en");
    await expect(entry).toHaveText("Admin");

    await entry.click();
    await expect(page).toHaveURL(/\/en\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: REVIEW_TITLE.en })).toBeVisible();
    await expectNoA11yViolations(page);

    const response = await page.goto("/fi/admin");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: REVIEW_TITLE.fi })).toBeVisible();
    await expect(adminLink(page, "fi")).toHaveAttribute("aria-current", "page");
  });
});
