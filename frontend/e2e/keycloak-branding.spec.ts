// Kalia-branded, bilingual Keycloak pages (ADR-0056): the login, registration
// and password-reset pages Keycloak renders on a different origin must appear
// in the locale the visitor was reading and meet the app's WCAG 2.1 AA bar.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { deleteKeycloakUser, expect, findKeycloakUser, keycloakAdminToken, test } from "./support/keycloakAccount";
import { waitForMessageTo } from "./support/mailpit";

const FRONTEND_ORIGIN = "http://localhost:3000";
const KEYCLOAK_ORIGIN = "http://localhost:8081";

const langOf = (page: Page) => page.locator("html").getAttribute("lang");

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

// The header "Sign in" control, whichever language the app page is in.
const clickSignIn = (page: Page) =>
  page.getByRole("button", { name: /^(Sign in|Kirjaudu sisään)$/ }).click();

test.describe("Keycloak pages follow the app's language", () => {
  for (const { locale, htmlLang, loginWord, registerWord } of [
    { locale: "en", htmlLang: "en", loginWord: "Username or email", registerWord: "Register" },
    { locale: "fi", htmlLang: "fi", loginWord: "Käyttäjätunnus tai sähköpostiosoite", registerWord: "Rekisteröidy" },
  ]) {
    test(`signing in from /${locale} reaches a ${htmlLang} Keycloak login form`, async ({ page }) => {
      await page.goto(`${FRONTEND_ORIGIN}/${locale}`);
      await clickSignIn(page);

      await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
      // Confirmed to fail before this change: with the realm's
      // internationalisation off and no ui_locales passed, Keycloak served
      // <html lang="en"> from every locale.
      expect(await langOf(page)).toBe(htmlLang);
      await expect(page.getByText(loginWord, { exact: false })).toBeVisible();
    });

    test(`the registration page reached from /${locale} is in ${htmlLang} and passes axe`, async ({
      page,
    }) => {
      await page.goto(`${FRONTEND_ORIGIN}/${locale}/sign-up`);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: /Continue to sign-up|Jatka rekisteröitymiseen/ }).click();
      await page.locator("#kc-register-form").waitFor();

      await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
      expect(await langOf(page)).toBe(htmlLang);
      await expect(page.getByRole("button", { name: registerWord })).toBeVisible();
      // Same WCAG 2.1 AA bar as the rest of the app — scanned here rather than
      // in a fourth registration test to keep /sign-up rate-limit pressure down.
      expect((await scanForA11yViolations(page)).violations).toEqual([]);
    });

    test(`the password-reset page reached from /${locale} is in ${htmlLang}`, async ({ page }) => {
      await page.goto(`${FRONTEND_ORIGIN}/${locale}`);
      await clickSignIn(page);
      await page.getByRole("link", { name: /Forgot Password\?|Unohditko salasanan\?/i }).click();

      expect(await langOf(page)).toBe(htmlLang);
    });
  }
});

test.describe("Keycloak pages meet WCAG 2.1 AA", () => {
  test("the login page has no accessibility violations", async ({ page }) => {
    await page.goto(`${FRONTEND_ORIGIN}/en`);
    await clickSignIn(page);
    await page.locator("#kc-form-login").waitFor();

    expect((await scanForA11yViolations(page)).violations).toEqual([]);
  });
  // The registration page's axe scan rides along with its language test above,
  // so registering (which the shared /sign-up rate limit counts) happens once
  // per locale, not twice.
});

test.describe("the locale survives the round trip", () => {
  test("landing on /fi and signing in returns to /fi", async ({ page, account }) => {
    await page.goto(`${FRONTEND_ORIGIN}/fi`);
    await clickSignIn(page);

    await page.locator("#username").fill(account.username);
    await page.locator("#password").fill(account.password);
    await page.getByRole("button", { name: /Kirjaudu|Sign In/ }).click();

    await expect(page).toHaveURL(`${FRONTEND_ORIGIN}/fi`);
    await expect(page.getByRole("link", { name: /^Profiili: / })).toBeVisible();
  });
});

test.describe("the verification email follows the same language", () => {
  test("registering from /fi sends a Finnish verification email", async ({ page, request }) => {
    const username = `fi-signup-${Date.now()}`;
    const email = `${username}@example.com`;

    await page.goto(`${FRONTEND_ORIGIN}/fi/sign-up`);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Jatka rekisteröitymiseen" }).click();

    await page.locator("#username").fill(username);
    await page.locator("#email").fill(email);
    await page.locator("#firstName").fill("Fi");
    await page.locator("#lastName").fill("Test");
    await page.getByRole("button", { name: "Rekisteröidy" }).click();

    const message = await waitForMessageTo(request, email);
    const body = (message.HTML || message.Text).toLowerCase();
    // "Vahvista sähköpostiosoitteesi" / "sähköpostiosoite" — the Finnish
    // verification wording, never the English "verify your email address".
    expect(body).toContain("sähköpost");
    expect(body).not.toContain("verify your email");

    const adminToken = await keycloakAdminToken(request);
    const created = await findKeycloakUser(request, adminToken, username);
    if (created) await deleteKeycloakUser(request, adminToken, created.id);
  });
});
