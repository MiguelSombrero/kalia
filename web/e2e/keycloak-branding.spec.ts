// Kalia-branded, bilingual Keycloak pages (ADR-0056, ADR-0074): the login,
// registration, email-verification and password-reset pages Keycloak renders
// on a different origin must appear in the locale the visitor was reading, in
// Kalia's identity, and meet the app's WCAG 2.2 AA bar at both agreed widths.
import type { Page } from "@playwright/test";
import { expect, test, uniqueUsername } from "./support/keycloakAccount";
import { waitForMessageTo } from "./support/mailpit";
import { expectNoA11yViolations } from "./support/a11y";
import { expectNoSidewaysScroll } from "./support/layout";
import { contrast, rgbOf } from "./support/colour";
import { WEB_ORIGIN, KEYCLOAK_ORIGIN } from "./support/origins";

// headerTop is where every Keycloak page's lockup starts (ADR-0074: the same
// height on every page, never centred vertically).
const VIEWPORTS = [
  { name: "phone", width: 375, height: 812, headerTop: 32 },
  { name: "desktop", width: 1280, height: 800, headerTop: 80 },
] as const;

const langOf = (page: Page) => page.locator("html").getAttribute("lang");

// The header "Sign in" control, whichever language the app page is in.
const clickSignIn = (page: Page) =>
  page.getByRole("button", { name: /^(Sign in|Kirjaudu sisään)$/ }).click();

test.describe("Keycloak pages follow the app's language", () => {
  for (const { locale, htmlLang, loginWord, registerWord } of [
    { locale: "en", htmlLang: "en", loginWord: "Username or email", registerWord: "Register" },
    { locale: "fi", htmlLang: "fi", loginWord: "Käyttäjätunnus tai sähköpostiosoite", registerWord: "Rekisteröidy" },
  ]) {
    test(`signing in from /${locale} reaches a ${htmlLang} Keycloak login form`, async ({ page }) => {
      await page.goto(`${WEB_ORIGIN}/${locale}`);
      await clickSignIn(page);

      await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
      // Confirmed to fail before this change: with the realm's
      // internationalisation off and no ui_locales passed, Keycloak served
      // <html lang="en"> from every locale.
      expect(await langOf(page)).toBe(htmlLang);
      await expect(page.getByText(loginWord, { exact: false })).toBeVisible();
    });

    test(`the registration page reached from /${locale} is in ${htmlLang}`, async ({
      page,
    }) => {
      await page.goto(`${WEB_ORIGIN}/${locale}/sign-up`);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: /Continue to sign-up|Jatka rekisteröitymiseen/ }).click();
      await page.locator("#kc-register-form").waitFor();

      await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
      expect(await langOf(page)).toBe(htmlLang);
      await expect(page.getByRole("button", { name: registerWord })).toBeVisible();
    });

    test(`the password-reset page reached from /${locale} is in ${htmlLang}`, async ({ page }) => {
      await page.goto(`${WEB_ORIGIN}/${locale}`);
      await clickSignIn(page);
      await page.getByRole("link", { name: /Forgot Password\?|Unohditko salasanan\?/i }).click();

      expect(await langOf(page)).toBe(htmlLang);
    });
  }
});

// axe checks text contrast but not a control's edge or the focus ring, the
// two non-text pairings WCAG 2.2 AA (1.4.11) holds to 3:1, so those are
// computed from the rendered page here. Text pairings are computed too, from
// the same colours, so a palette that drifts fails here with the pairing named.
const expectRenderedContrast = async (page: Page) => {
  const pairs = await page.evaluate(() => {
    const visible = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const page = getComputedStyle(document.body).backgroundColor;
    const out: { what: string; fg: string; bg: string; needs: number }[] = [];
    const title = document.querySelector("#kc-page-title");
    if (title) out.push({ what: "title", fg: getComputedStyle(title).color, bg: page, needs: 4.5 });
    for (const a of document.querySelectorAll("main a")) {
      if (visible(a)) out.push({ what: `link "${a.textContent?.trim()}"`, fg: getComputedStyle(a).color, bg: page, needs: 4.5 });
    }
    for (const b of document.querySelectorAll("[type=submit]")) {
      const s = getComputedStyle(b);
      if (visible(b)) out.push({ what: "submit button label", fg: s.color, bg: s.backgroundColor, needs: 4.5 });
    }
    for (const input of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox])")) {
      const control = input.closest(".pf-v5-c-form-control");
      if (control && visible(input)) {
        out.push({ what: `edge of #${input.id}`, fg: getComputedStyle(control, "::before").borderTopColor, bg: page, needs: 3 });
      }
    }
    return out;
  });
  for (const { what, fg, bg, needs } of pairs) {
    expect(contrast(rgbOf(fg), rgbOf(bg)), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(needs);
  }

  const field = page.locator("input:not([type=hidden]):not([type=checkbox])").first();
  if ((await field.count()) > 0) {
    await field.focus();
    const [ring, ground, style, width] = await field.evaluate((e) => [
      getComputedStyle(e).outlineColor,
      getComputedStyle(document.body).backgroundColor,
      getComputedStyle(e).outlineStyle,
      getComputedStyle(e).outlineWidth,
    ]);
    expect(style, "focus draws no outline").not.toBe("none");
    expect(parseFloat(width), "focus outline width").toBeGreaterThanOrEqual(2);
    expect(contrast(rgbOf(ring), rgbOf(ground)), `focus ring: ${ring} on ${ground}`).toBeGreaterThanOrEqual(3);
  }
};

const expectOpenColumn = async (page: Page, viewport: (typeof VIEWPORTS)[number]) => {
  const column = await page.locator("main").boundingBox();
  const header = await page.locator("#kc-header").boundingBox();
  const width = Math.min(448, viewport.width - 32);
  expect(column?.width, "the form column's width").toBeCloseTo(width, 0);
  expect(column?.x, "the form column is centred").toBeCloseTo((viewport.width - width) / 2, 0);
  expect(header?.x, "the lockup starts at the column's edge").toBeCloseTo(column?.x ?? -1, 0);
  expect(header?.y, "the page starts at the same height as every other").toBeCloseTo(viewport.headerTop, 0);
};

// The mark is a CSS background on the lockup, so only fetching it proves the
// theme served it.
const expectKaliaLockup = async (page: Page) => {
  const home = page.locator("#kc-header-wrapper").getByRole("link", { name: "Kalia" });
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute("href", WEB_ORIGIN);
  const mark = await home.evaluate((a) => getComputedStyle(a, "::before").backgroundImage);
  const url = mark.match(/url\("?([^")]+)"?\)/)?.[1];
  expect(url, `the lockup draws no mark: ${mark}`).toMatch(/\/img\/kalia-mark\.svg$/);
  const response = await page.request.get(url!);
  expect(response.ok(), `${url} did not load`).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
};

const expectInIdentityAtBothWidths = async (page: Page) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await test.step(`${viewport.name} ${viewport.width}×${viewport.height}`, async () => {
      await expectKaliaLockup(page);
      await expectOpenColumn(page, viewport);
      await expect(page.locator("#login-select-toggle")).toBeHidden();
      await expectNoSidewaysScroll(page);
      await expectNoA11yViolations(page);
      await expectRenderedContrast(page);
    });
  }
};

test.describe("Keycloak pages carry Kalia's identity at both widths", () => {
  for (const { locale, register, forgot, signInHeading, registerHeading, resetHeading, verifyHeading } of [
    {
      locale: "en",
      register: "Register",
      forgot: "Forgot Password?",
      signInHeading: "Sign in to your account",
      registerHeading: "Register",
      resetHeading: "Forgot Your Password?",
      verifyHeading: "Email verification",
    },
    {
      locale: "fi",
      register: "Rekisteröidy",
      forgot: "Unohditko salasanan?",
      signInHeading: "Kirjaudu sisään",
      registerHeading: "Rekisteröidy",
      resetHeading: "Unohditko salasanasi?",
      verifyHeading: "Sähköpostiosoitteen varmistus",
    },
  ]) {
    const openLogin = async (page: Page) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${WEB_ORIGIN}/${locale}`);
      await clickSignIn(page);
      await page.locator("#kc-form-login").waitFor();
      expect(await langOf(page)).toBe(locale);
    };

    test(`the ${locale} login page`, async ({ page }) => {
      await openLogin(page);
      await expect(page.getByRole("heading", { level: 1, name: signInHeading })).toBeVisible();
      await expectInIdentityAtBothWidths(page);
    });

    test(`the ${locale} registration page`, async ({ page }) => {
      await openLogin(page);
      await page.getByRole("link", { name: register, exact: true }).click();
      await page.locator("#kc-register-form").waitFor();
      expect(await langOf(page)).toBe(locale);
      await expect(page.getByRole("heading", { level: 1, name: registerHeading })).toBeVisible();
      await expectInIdentityAtBothWidths(page);
    });

    test(`the ${locale} email-verification page`, async ({ page }) => {
      const username = uniqueUsername(`identity-${locale}`);
      await openLogin(page);
      await page.getByRole("link", { name: register, exact: true }).click();
      await page.locator("#username").fill(username);
      await page.locator("#email").fill(`${username}@example.com`);
      await page.locator("#firstName").fill("Identity");
      await page.locator("#lastName").fill("Check");
      await page.getByRole("button", { name: register }).click();

      await expect(page.getByRole("heading", { level: 1, name: verifyHeading })).toBeVisible();
      expect(await langOf(page)).toBe(locale);
      await expectInIdentityAtBothWidths(page);
    });

    test(`the ${locale} password-reset page`, async ({ page }) => {
      await openLogin(page);
      await page.getByRole("link", { name: forgot }).click();
      await page.locator("#kc-reset-password-form").waitFor();
      expect(await langOf(page)).toBe(locale);
      await expect(page.getByRole("heading", { level: 1, name: resetHeading })).toBeVisible();
      await expectInIdentityAtBothWidths(page);
    });
  }
});

test.describe("the locale survives the round trip", () => {
  test("landing on /fi and signing in returns to /fi", async ({ page, account }) => {
    await page.goto(`${WEB_ORIGIN}/fi`);
    await clickSignIn(page);

    await page.locator("#username").fill(account.username);
    await page.locator("#password").fill(account.password);
    await page.getByRole("button", { name: /Kirjaudu|Sign In/ }).click();

    await expect(page).toHaveURL(`${WEB_ORIGIN}/fi`);
    await expect(page.getByRole("link", { name: /^Profiili: / })).toBeVisible();

    // Sign back out: this spec shares the worker `account` with the other
    // signed-in specs, and a lingering Keycloak SSO session for it is the
    // contention the suite's serial specs already guard against. The
    // federated sign-out returns to the default-locale home, not /fi.
    await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
    await expect(page.getByRole("button", { name: /^(Sign in|Kirjaudu sisään)$/ })).toBeVisible();
  });
});

test.describe("the verification email follows the same language", () => {
  test("registering from /fi sends a Finnish verification email", async ({ page, request }) => {
    const username = uniqueUsername("fi-signup");
    const email = `${username}@example.com`;

    await page.goto(`${WEB_ORIGIN}/fi/sign-up`);
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
  });
});
