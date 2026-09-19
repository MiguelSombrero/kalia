// Exercises self-registration end to end: Kalia's own /sign-up page redirects
// into Keycloak's registration flow, an unverified account is blocked from
// completing sign-in, registering an already-used email says so, and the
// verification link is read back out of Mailpit the same way
// keycloak-email.spec.ts does. The first test also pins ADR-0033's
// account-linking decision — see its comments below.
import type { Page } from "@playwright/test";
import Redis from "ioredis";
import {
  createUnverifiedKeycloakUser,
  expect,
  findKeycloakUser,
  keycloakAdminToken,
  signIn,
  test,
} from "./support/keycloakAccount";
import { clickThroughKeycloakAction } from "./support/keycloakFlow";
import { linkFromMessage, waitForMessageTo } from "./support/mailpit";
import { FRONTEND_ORIGIN, KEYCLOAK_ORIGIN } from "./support/origins";

// Unprefixed on http, `__Secure-` prefixed on https (lib/auth/sessionCookie.ts
// carries the same list for server-side reads) — this suite always runs
// against FRONTEND_ORIGIN's http, but checking both keeps that assumption
// from failing silently if that ever changes.
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

// Reads the Auth.js adapter's own user id for the browser's current session
// straight out of Valkey (lib/auth/valkeyAdapter.ts's `auth:session:<token>`
// record) — the identity Auth.js's account-linking resolves a sign-in to,
// and the most direct way to prove two sign-ins reached the same one. Takes
// an already-open client so a test calling this more than once shares one
// connection instead of opening a fresh one per call.
const kaliaUserId = async (page: Page, valkey: Redis): Promise<string> => {
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find((cookie) => SESSION_COOKIE_NAMES.includes(cookie.name))?.value;
  expect(sessionToken, "the page carries no Auth.js session cookie").toBeTruthy();

  const raw = await valkey.get(`auth:session:${sessionToken}`);
  expect(raw, "no Auth.js session record found in Valkey for this cookie").toBeTruthy();
  return (JSON.parse(raw!) as { userId: string }).userId;
};

// Fills the registration form's profile fields: the keycloak.v2 theme's
// register.ftl asks for username/email/firstName/lastName but collects the
// password separately, as a follow-up UPDATE_PASSWORD required action once
// the address is verified (see setPasswordWhenPrompted below) — tolerate a
// password field being present too, in case a differently themed realm adds
// one back.
const fillProfileFields = async (page: Page, fields: { username: string; email: string }) => {
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(fields.username);
  await page.locator("#email").fill(fields.email);
  if (await page.locator("#firstName").count()) {
    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Test");
  }
};

// Keycloak defers password collection to a separate UPDATE_PASSWORD required
// action, shown after VERIFY_EMAIL is satisfied — its login-update-password.ftl
// names the field "password-new", not "password" (that id is the sign-in
// form's). Fill whichever is actually on the page, so this helper also works
// for flows where a realm theme puts the password back on the registration
// form itself.
const setPasswordWhenPrompted = async (page: Page, password: string) => {
  const newPassword = page.locator("#password-new").or(page.locator("#password"));
  if (!(await newPassword.count())) return;
  await newPassword.fill(password);
  if (await page.locator("#password-confirm").count()) {
    await page.locator("#password-confirm").fill(password);
  }
  await page.getByRole("button", { name: /submit|save|continue|update/i }).click();
};

const startSignUp = async (page: Page) => {
  await page.goto(`${FRONTEND_ORIGIN}/en/sign-up`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to sign-up" }).click();
};

test.describe("self-registration", () => {
  test("register, verify, sign in, sign out, and sign in again", async ({ page, request }) => {
    const username = `signup-${Date.now()}`;
    const email = `${username}@example.com`;
    const password = "correct-horse-battery";

    await startSignUp(page);
    await fillProfileFields(page, { username, email });
    await page.getByRole("button", { name: /register|sign.?up/i }).click();

    // The browser is still on Keycloak, not redirected back with a session —
    // an unverified account never completes the authorization code flow.
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));

    const message = await waitForMessageTo(request, email);
    expect(message.From.Name).toBe("Kalia");
    const link = linkFromMessage(message);

    await page.goto(link);
    await clickThroughKeycloakAction(page);

    // Verifying the email lands on a follow-up UPDATE_PASSWORD required
    // action — the registration form itself never asked for a password.
    await setPasswordWhenPrompted(page, password);
    await clickThroughKeycloakAction(page);

    await expect(page).toHaveURL(new RegExp(`^${FRONTEND_ORIGIN}/en`));
    await expect(page.getByRole("link", { name: /^Profile: /i })).toBeVisible();

    const valkey = new Redis("redis://localhost:6379");
    // This sign-in went through "keycloak-register" (ADR-0055); the account
    // index it wrote is filed under that provider id.
    const registeredUserId = await kaliaUserId(page, valkey);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.getByRole("button", { name: "Sign in" }).click();
    await page.locator("#username").waitFor();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("link", { name: /^Profile: /i })).toBeVisible();

    // Pins ADR-0033: this second sign-in goes through the plain "keycloak"
    // provider, which misses the account index "keycloak-register" wrote and
    // falls back to `getUserByEmail` — reaching the same Kalia user only
    // because `allowDangerousEmailAccountLinking` is set. Confirmed to throw
    // `OAuthAccountNotLinked` here instead, with the flag unset.
    const secondUserId = await kaliaUserId(page, valkey);
    await valkey.quit();
    expect(secondUserId).toBe(registeredUserId);
  });

  // Regression: the verification link is emailed, so it is routinely opened in
  // a different browser from the one that registered — and that browser may
  // already hold an SSO session for someone else (a shared machine, or an
  // older account of one's own). Keycloak deliberately refuses the token then,
  // with a 400 and "already authenticated as different user". Its own
  // error.ftl offers the only escape from that page — the "Back to
  // Application" link — and renders it solely when the client carries a
  // baseUrl (`<#if client?? && client.baseUrl?has_content>`). kalia-frontend
  // had none, so the page was a dead end reachable only from an emailed link:
  // no link, no button, the address bar the sole way out. What this asserts is
  // that escape hatch, not Keycloak's refusal, which is correct and is left
  // alone.
  test("a verification link opened where someone else is signed in still offers a way back to Kalia", async ({
    page,
    browser,
    request,
    account,
  }) => {
    const username = `foreign-session-${Date.now()}`;
    const email = `${username}@example.com`;

    await startSignUp(page);
    await fillProfileFields(page, { username, email });
    await page.getByRole("button", { name: /register|sign.?up/i }).click();
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));

    const link = linkFromMessage(await waitForMessageTo(request, email));

    // A second browser context is the whole point: a fresh cookie jar that
    // then signs in as the worker's own fixture account, so Keycloak sees an
    // identity cookie for a *different* user than the token's subject.
    const otherBrowser = await browser.newContext();
    try {
      const otherPage = await otherBrowser.newPage();
      await otherPage.goto(`${FRONTEND_ORIGIN}/en`);
      await signIn(otherPage, account);

      await otherPage.goto(link);

      await expect(otherPage.getByText(/already authenticated as different user/i)).toBeVisible();
      const backToApplication = otherPage.getByRole("link", { name: /back to application/i });
      await expect(backToApplication).toBeVisible();
      // The link has to actually leave Keycloak for Kalia, not merely exist.
      await backToApplication.click();
      await expect(otherPage).toHaveURL(new RegExp(`^${FRONTEND_ORIGIN}`));
    } finally {
      await otherBrowser.close();
    }
  });

  test("an unverified account cannot sign in — it stays on Keycloak's verify-email page", async ({
    page,
    request,
  }) => {
    const adminToken = await keycloakAdminToken(request);
    const username = `unverified-${Date.now()}`;
    const email = `${username}@example.com`;
    const password = "correct-horse-battery";
    const userId = await createUnverifiedKeycloakUser(request, adminToken, username, email);

    const setPassword = await request.put(`${KEYCLOAK_ORIGIN}/admin/realms/kalia/users/${userId}/reset-password`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { type: "password", value: password, temporary: false },
    });
    expect(setPassword.ok()).toBeTruthy();

    await page.goto(`${FRONTEND_ORIGIN}/en`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.locator("#username").waitFor();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Blocked from the application entirely: still on Keycloak, never
    // signed in to Kalia.
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
    await expect(page.getByRole("link", { name: /^Profile: /i })).not.toBeVisible();
  });

  test("registering an already-used email says so explicitly", async ({ page, request, account }) => {
    const adminToken = await keycloakAdminToken(request);
    const existing = await findKeycloakUser(request, adminToken, account.username);
    expect(existing, `fixture account ${account.username} should already exist`).toBeTruthy();
    const existingEmail = `${account.username}@example.com`;

    await startSignUp(page);
    await fillProfileFields(page, {
      username: `duplicate-${Date.now()}`,
      email: existingEmail,
    });
    await page.getByRole("button", { name: /register|sign.?up/i }).click();

    await expect(page.getByText(/already exists|already registered/i)).toBeVisible();
    // Still on the registration form, not signed in — this never reaches
    // Kalia at all.
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
  });

  test("Keycloak itself refuses a second live account with an existing email, bypassing Kalia's own sign-up form entirely", async ({
    request,
    account,
  }) => {
    const adminToken = await keycloakAdminToken(request);
    const existing = await findKeycloakUser(request, adminToken, account.username);
    expect(existing, `fixture account ${account.username} should already exist`).toBeTruthy();

    // Straight against Keycloak's admin API, not Kalia's registration form:
    // realm-export.json's duplicateEmailsAllowed: false is what ADR-0033's
    // account-linking flag actually depends on for safety — it never sees
    // two live Keycloak users sharing an email to merge in the first place,
    // so it can recover one person's own account but never hand two
    // different people's cellars to each other.
    const response = await request.post(`${KEYCLOAK_ORIGIN}/admin/realms/kalia/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username: `admin-duplicate-${Date.now()}`,
        email: `${account.username}@example.com`,
        enabled: true,
        emailVerified: true,
        firstName: "Admin",
        lastName: "Duplicate",
      },
    });

    expect(response.status(), "Keycloak allowed a second live account with an existing email").toBe(409);
  });
});
