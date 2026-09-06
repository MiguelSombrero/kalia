// Exercises self-registration end to end: Kalia's own /sign-up page redirects
// into Keycloak's registration flow, an unverified account is blocked from
// completing sign-in, registering an already-used email says so, and the
// verification link is read back out of Mailpit the same way
// keycloak-email.spec.ts does.
import type { Page } from "@playwright/test";
import {
  createUnverifiedKeycloakUser,
  deleteKeycloakUser,
  expect,
  findKeycloakUser,
  keycloakAdminToken,
  test,
} from "./support/keycloakAccount";
import { linkFromMessage, waitForMessageTo } from "./support/mailpit";

const FRONTEND_ORIGIN = "http://localhost:3000";
const KEYCLOAK_ORIGIN = "http://localhost:8081";

// Fills whichever of Keycloak's registration fields are present: the realm
// asks for username/email/password, but the stock register.ftl also shows
// firstName/lastName unless the user profile is customized to drop them
// (ADR-0055's Consequences) — tolerate either shape rather than assume one.
const fillRegistrationForm = async (
  page: Page,
  fields: { username: string; email: string; password: string },
) => {
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(fields.username);
  await page.locator("#email").fill(fields.email);
  await page.locator("#password").fill(fields.password);
  if (await page.locator("#password-confirm").count()) {
    await page.locator("#password-confirm").fill(fields.password);
  }
  if (await page.locator("#firstName").count()) {
    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Test");
  }
};

const startSignUp = async (page: Page) => {
  await page.goto(`${FRONTEND_ORIGIN}/en/sign-up`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to sign-up" }).click();
};

// Keycloak guards action links behind a confirmation page and may show a
// "back to application" page instead of redirecting on its own — same
// tolerant loop as keycloak-email.spec.ts.
const clickThroughKeycloakAction = async (page: Page) => {
  for (let step = 0; step < 3 && page.url().startsWith(KEYCLOAK_ORIGIN); step++) {
    const next = page
      .getByRole("link", { name: /proceed|continue|back to application/i })
      .or(page.getByRole("button", { name: /proceed|continue|submit/i }));
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForLoadState();
  }
};

test.describe("self-registration", () => {
  test("register, verify, sign in, sign out, and sign in again", async ({ page, request }) => {
    const username = `signup-${Date.now()}`;
    const email = `${username}@example.com`;
    const password = "correct-horse-battery";

    await startSignUp(page);
    await fillRegistrationForm(page, { username, email, password });
    await page.getByRole("button", { name: /register|sign.?up/i }).click();

    // The browser is still on Keycloak, not redirected back with a session —
    // an unverified account never completes the authorization code flow.
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));

    const message = await waitForMessageTo(request, email);
    expect(message.From.Name).toBe("Kalia");
    const link = linkFromMessage(message);

    await page.goto(link);
    await clickThroughKeycloakAction(page);

    await expect(page).toHaveURL(new RegExp(`^${FRONTEND_ORIGIN}/en`));
    await expect(page.getByRole("link", { name: /^Profile: /i })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.getByRole("button", { name: "Sign in" }).click();
    await page.locator("#username").waitFor();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("link", { name: /^Profile: /i })).toBeVisible();

    const adminToken = await keycloakAdminToken(request);
    const created = await findKeycloakUser(request, adminToken, username);
    if (created) await deleteKeycloakUser(request, adminToken, created.id);
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

    try {
      const setPassword = await request.put(
        `${KEYCLOAK_ORIGIN}/admin/realms/kalia/users/${userId}/reset-password`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { type: "password", value: password, temporary: false },
        },
      );
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
    } finally {
      await deleteKeycloakUser(request, adminToken, userId);
    }
  });

  test("registering an already-used email says so explicitly", async ({ page, request, account }) => {
    const adminToken = await keycloakAdminToken(request);
    const existing = await findKeycloakUser(request, adminToken, account.username);
    expect(existing, `fixture account ${account.username} should already exist`).toBeTruthy();
    const existingEmail = `${account.username}@example.com`;

    await startSignUp(page);
    await fillRegistrationForm(page, {
      username: `duplicate-${Date.now()}`,
      email: existingEmail,
      password: "correct-horse-battery",
    });
    await page.getByRole("button", { name: /register|sign.?up/i }).click();

    await expect(page.getByText(/already exists|already registered/i)).toBeVisible();
    // Still on the registration form, not signed in — this never reaches
    // Kalia at all.
    await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
  });
});
