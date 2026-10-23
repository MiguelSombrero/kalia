// Keycloak's errors in Kalia's error sign: ADR-0074, docs/design.md "Feedback and errors".
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, keycloakAdminToken, test, uniqueUsername } from "./support/keycloakAccount";
import { expectNoA11yViolations } from "./support/a11y";
import { contrast, rgbOf } from "./support/colour";
import { expectNoSidewaysScroll } from "./support/layout";
import { FRONTEND_ORIGIN, KEYCLOAK_ORIGIN } from "./support/origins";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
] as const;

const LOCALES = [
  { locale: "en", signIn: "Sign in", register: "Register" },
  { locale: "fi", signIn: "Kirjaudu sisään", register: "Rekisteröidy" },
] as const;

type Locale = (typeof LOCALES)[number];

const palette = (page: Page) =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const token = (name: string) => root.getPropertyValue(`--kalia-color-${name}`).trim();
    return {
      ground: getComputedStyle(document.body).backgroundColor,
      foreground: token("foreground"),
      border: token("border"),
      destructive: token("destructive"),
      destructiveForeground: token("destructive-foreground"),
    };
  });

const expectSameColour = (actual: string, expected: string, what: string) =>
  expect(rgbOf(actual), `${what}: ${actual}, expected ${expected}`).toEqual(rgbOf(expected));

const maskUrlOf = (mask: string) => mask.match(/url\("?([^")]+)"?\)/)?.[1];

const expectMaskServed = async (page: Page, mask: string, file: string) => {
  const url = maskUrlOf(mask);
  expect(url, `the cross is not drawn from ${file}: ${mask}`).toMatch(new RegExp(`/img/${file}$`));
  const response = await page.request.get(url!);
  expect(response.ok(), `${url} did not load`).toBeTruthy();
};

const expectFieldErrorSign = async (page: Page, fieldId: string) => {
  const colours = await palette(page);
  const rendered = await page.evaluate((id) => {
    const input = document.getElementById(id)!;
    const control = input.parentElement!.closest(".pf-v5-c-form-control")!;
    const line = document.querySelector(`#input-error-${id} .kc-feedback-text`)!;
    const statusIcon = control.querySelector<HTMLElement>(".pf-v5-c-form-control__icon");
    const before = getComputedStyle(control, "::before");
    const square = getComputedStyle(line, "::before");
    const cross = getComputedStyle(line, "::after");
    return {
      edges: {
        top: before.borderTopColor,
        right: before.borderRightColor,
        left: before.borderLeftColor,
        bottom: getComputedStyle(control, "::after").borderBottomColor,
      },
      square: { colour: square.backgroundColor, width: square.width, height: square.height },
      cross: { colour: cross.backgroundColor, mask: cross.maskImage || cross.webkitMaskImage },
      words: getComputedStyle(line).color,
      statusIconShown: statusIcon !== null && statusIcon.offsetParent !== null,
    };
  }, fieldId);

  for (const [side, colour] of Object.entries(rendered.edges)) {
    expectSameColour(colour, colours.destructive, `the ${side} edge of #${fieldId}`);
  }
  expectSameColour(rendered.square.colour, colours.destructive, "the error line's square");
  expect([rendered.square.width, rendered.square.height], "the square's size").toEqual(["20px", "20px"]);
  expectSameColour(rendered.cross.colour, colours.destructiveForeground, "the cross");
  await expectMaskServed(page, rendered.cross.mask, "error-cross-small.svg");
  expectSameColour(rendered.words, colours.foreground, "the error's words");
  expect(rendered.statusIconShown, "PatternFly's own error icon is shown beside the sign").toBe(false);

  expect(contrast(rgbOf(colours.destructive), rgbOf(colours.ground)), "the square on the page").toBeGreaterThanOrEqual(3);
  expect(
    contrast(rgbOf(colours.destructiveForeground), rgbOf(colours.destructive)),
    "the cross on the square",
  ).toBeGreaterThanOrEqual(3);

  const message = (await page.locator(`#input-error-${fieldId}`).textContent())!.trim();
  expect(message, `#${fieldId} carries no error message`).not.toBe("");
  await expect(page.locator(`#${fieldId}`)).toHaveAccessibleDescription(message);
};

const expectErrorAlertBox = async (page: Page) => {
  const colours = await palette(page);
  const alert = page.locator(".pf-v5-c-alert.pf-m-danger");
  await expect(alert).toBeVisible();
  const rendered = await alert.evaluate((box) => {
    const cell = box.querySelector(".pf-v5-c-alert__icon")!;
    const title = box.querySelector(".pf-v5-c-alert__title")!;
    const s = getComputedStyle(box);
    const cross = getComputedStyle(cell, "::before");
    return {
      edges: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor],
      edgeWidths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      cell: { colour: getComputedStyle(cell).backgroundColor, divider: getComputedStyle(cell).borderRightColor },
      cross: { colour: cross.backgroundColor, mask: cross.maskImage || cross.webkitMaskImage },
      patternflyIcons: [...cell.querySelectorAll<HTMLElement>("*")].filter((e) => e.offsetParent !== null).length,
      words: getComputedStyle(title).color,
    };
  });

  for (const colour of rendered.edges) expectSameColour(colour, colours.border, "the alert's edge");
  expect(rendered.edgeWidths, "the alert's edge widths").toEqual(["1px", "1px", "1px", "1px"]);
  expectSameColour(rendered.cell.colour, colours.destructive, "the alert's cell");
  expectSameColour(rendered.cell.divider, colours.border, "the edge between cell and message");
  expectSameColour(rendered.cross.colour, colours.destructiveForeground, "the alert's cross");
  await expectMaskServed(page, rendered.cross.mask, "error-cross.svg");
  expect(rendered.patternflyIcons, "PatternFly's own error icon is shown beside the sign").toBe(0);
  expectSameColour(rendered.words, colours.foreground, "the alert's words");
};

const atBothWidths = async (page: Page, check: () => Promise<void>) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await test.step(`${viewport.width}×${viewport.height}`, async () => {
      await check();
      await expectNoSidewaysScroll(page);
      await expectNoA11yViolations(page);
    });
  }
};

const openSignIn = async (page: Page, { locale, signIn }: Locale) => {
  await page.setViewportSize(VIEWPORTS[1]);
  await page.goto(`${FRONTEND_ORIGIN}/${locale}`);
  await page.getByRole("button", { name: signIn, exact: true }).click();
  await page.locator("#kc-form-login").waitFor();
};

const signInAs = async (page: Page, l: Locale, username: string, password: string) => {
  await openSignIn(page, l);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
  await page.waitForLoadState();
  await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
};

const createUser = async (
  request: APIRequestContext,
  prefix: string,
  extra: { enabled?: boolean; requiredActions?: string[] },
) => {
  const username = uniqueUsername(prefix);
  const password = "correct-horse-battery";
  const response = await request.post(`${KEYCLOAK_ORIGIN}/admin/realms/kalia/users`, {
    headers: { Authorization: `Bearer ${await keycloakAdminToken(request)}` },
    data: {
      username,
      email: `${username}@example.com`,
      emailVerified: true,
      enabled: extra.enabled ?? true,
      firstName: "Error",
      lastName: "Sign",
      requiredActions: extra.requiredActions ?? [],
      credentials: [{ type: "password", value: password, temporary: false }],
    },
  });
  expect(response.ok(), `could not create Keycloak user ${username}`).toBeTruthy();
  return { username, password };
};

for (const l of LOCALES) {
  test.describe(`Keycloak's errors in ${l.locale} carry Kalia's error sign`, () => {
    test("a taken username marks the username field", async ({ page, account }) => {
      await openSignIn(page, l);
      await page.getByRole("link", { name: l.register, exact: true }).click();
      await page.locator("#username").fill(account.username);
      await page.locator("#email").fill(`${uniqueUsername("taken")}@example.com`);
      await page.locator("#firstName").fill("Taken");
      await page.locator("#lastName").fill("Name");
      await page.getByRole("button", { name: l.register, exact: true }).click();
      await page.locator("#input-error-username").waitFor();

      await atBothWidths(page, () => expectFieldErrorSign(page, "username"));
    });

    test("passwords that do not match mark the confirmation field", async ({ page, request }) => {
      const { username, password } = await createUser(request, `mismatch-${l.locale}`, {
        requiredActions: ["UPDATE_PASSWORD"],
      });
      await signInAs(page, l, username, password);
      await page.locator("#password-new").fill("first-new-password");
      await page.locator("#password-confirm").fill("second-new-password");
      await page.locator("#kc-submit").click();
      await page.locator("#input-error-password-confirm").waitFor();

      await atBothWidths(page, () => expectFieldErrorSign(page, "password-confirm"));
    });

    // Not the worker `account`: each failure counts towards its brute-force lockout (ADR-0061).
    test("a wrong password marks the username field", async ({ page, request }) => {
      const { username } = await createUser(request, `wrong-password-${l.locale}`, {});
      await signInAs(page, l, username, "not-the-password");
      await page.locator("#input-error-username").waitFor();

      await atBothWidths(page, () => expectFieldErrorSign(page, "username"));
    });

    test("an error about the whole sign-in is the box with the red cell", async ({ page, request }) => {
      const { username, password } = await createUser(request, `disabled-${l.locale}`, { enabled: false });
      await signInAs(page, l, username, password);

      await atBothWidths(page, () => expectErrorAlertBox(page));
    });
  });
}
