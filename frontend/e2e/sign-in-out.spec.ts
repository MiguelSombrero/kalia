// Exercises the whole stack against compose-run Keycloak and Valkey
// (docs/architecture.md §6, §7); credentials are the dev-only account in
// keycloak/realm-export.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import Redis from "ioredis";

const USERNAME = "testuser";
const PASSWORD = "testuser123";

// Do not parallelize: measured 1-2 of 6 specs failing when run concurrently,
// always cycling sign-in/sign-out, since all specs share one realm user.
test.describe.configure({ mode: "serial" });

// Re-registered per document: a blocked navigation leaves the document in
// place, which is the case this is guarding.
const collectCspViolations = async (page: Page) => {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: violations });
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations ?? []);
};

// Reads/rewrites the stored token set so refresh tests can force an expiry
// instead of waiting out the real 5-minute lifespan (keycloak/realm-export.json).
const storedAccount = async (page: Page) => {
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find((cookie) => cookie.name === "authjs.session-token")?.value;
  expect(sessionToken, "the page carries no Auth.js session cookie").toBeTruthy();

  const valkey = new Redis("redis://localhost:6379");
  const key = `auth:session-account:${sessionToken}`;
  const read = async () => JSON.parse((await valkey.get(key))!) as Record<string, unknown>;
  return {
    read,
    // KEEPTTL, or the patch would strip the expiry the record should carry.
    patch: async (fields: Record<string, unknown>) =>
      valkey.set(key, JSON.stringify({ ...(await read()), ...fields }), "KEEPTTL"),
    close: () => valkey.quit(),
  };
};

// Ends the Keycloak SSO session from the IdP side, so only Back-Channel
// Logout (ADR-0031) can end the matching Kalia session.
const endKeycloakSessionViaAdmin = async (request: APIRequestContext) => {
  const adminUsername = process.env.KEYCLOAK_ADMIN ?? "admin";
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

  const tokenResponse = await request.post(
    "http://localhost:8081/realms/master/protocol/openid-connect/token",
    {
      form: {
        grant_type: "password",
        client_id: "admin-cli",
        username: adminUsername,
        password: adminPassword,
      },
    },
  );
  expect(tokenResponse.ok(), "could not obtain a Keycloak admin token").toBeTruthy();
  const { access_token: adminToken } = (await tokenResponse.json()) as { access_token: string };
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const usersResponse = await request.get("http://localhost:8081/admin/realms/kalia/users", {
    headers: adminHeaders,
    params: { username: USERNAME, exact: "true" },
  });
  const [user] = (await usersResponse.json()) as { id: string }[];
  expect(user, `${USERNAME} has no Keycloak session to end`).toBeTruthy();

  const logoutResponse = await request.post(
    `http://localhost:8081/admin/realms/kalia/users/${user.id}/logout`,
    { headers: adminHeaders },
  );
  expect(logoutResponse.ok(), "the admin logout call itself failed").toBeTruthy();
};

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const signIn = async (page: Page) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toBeVisible();
};

test("signs in through Keycloak, shows the user's name, and signs out", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  await signIn(page);

  await expect(page).toHaveURL(/localhost:3000/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toHaveCount(0);
  expect((await scanForA11yViolations(page)).violations).toEqual([]);
});

// One click is the assertion: a blocked sign-out deletes the local session,
// so a second click would look fine while Keycloak's session survives (ADR-0025).
test("signing out takes one click and is not blocked by the CSP", async ({ page }) => {
  const cspViolations = await collectCspViolations(page);
  await page.goto("/en");
  await signIn(page);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(await cspViolations()).toEqual([]);
});

// Two cycles: staleness only shows on the second sign-out, when a stale
// `id_token_hint` makes Keycloak ask to confirm the logout (ADR-0025).
test("signs in and out twice without Keycloak asking to confirm the logout", async ({ page }) => {
  await page.goto("/en");

  for (const cycle of [1, 2]) {
    await signIn(page);
    await page.getByRole("button", { name: "Sign out" }).click();

    // Never Keycloak's confirmation page, and never left stranded on Keycloak.
    await expect(
      page.getByText("Do you want to log out?"),
      `cycle ${cycle}: Keycloak asked to confirm the logout`,
    ).toHaveCount(0);
    await expect(page, `cycle ${cycle}: did not return to Kalia`).toHaveURL(/localhost:3000/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // The Keycloak SSO session must be gone too, or this skips the prompt.
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.locator("#username"),
      `cycle ${cycle}: Keycloak did not re-prompt, so its SSO session survived`,
    ).toBeVisible();
    await page.goto("/en");
  }
});

// Sent to the real backend, not compared as a string: withholding an expired
// token also keeps browsing working, so only backend acceptance proves renewal (ADR-0029).
test("renews an expired access token instead of dropping it", async ({ page, request }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount(page);
  const before = await account.read();
  await account.patch({ expires_at: Math.floor(Date.now() / 1000) - 1 });

  // Calls the backend, so the token is actually fetched.
  await page.goto("/en/beers");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const after = await account.read();
  await account.close();

  expect(after.access_token, "the expired token was not replaced").not.toBe(before.access_token);
  expect(after.expires_at as number).toBeGreaterThan(Math.floor(Date.now() / 1000));

  // Must pass the backend's signature/issuer/audience checks (ADR-0028).
  const me = await request.get("http://localhost:8080/api/v1/me", {
    headers: { Authorization: `Bearer ${after.access_token as string}` },
  });
  expect(me.status(), "the backend rejected the renewed token").toBe(200);
});

// Two browser contexts: one page can't detect tokens shared between
// sessions, so collapsing this to one deletes the guard without failing (ADR-0030).
test("signing out on one device leaves the other's session intact", async ({
  browser,
  request,
}) => {
  const contexts: BrowserContext[] = [];
  const signedInPage = async () => {
    const context = await browser.newContext();
    contexts.push(context);
    const page = await context.newPage();
    await page.goto("/en");
    await signIn(page);
    return page;
  };

  const laptop = await signedInPage();
  const phone = await signedInPage();

  await laptop.getByRole("button", { name: "Sign out" }).click();
  await expect(laptop.getByRole("button", { name: "Sign in" })).toBeVisible();

  // The laptop's own Keycloak SSO session ended, so it's asked for credentials again.
  await laptop.getByRole("button", { name: "Sign in" }).click();
  await expect(
    laptop.locator("#username"),
    "the laptop stayed authenticated at Keycloak, so the wrong session was ended",
  ).toBeVisible();

  // The phone never signed out, and its tokens are still its own and usable.
  await phone.reload();
  await expect(phone.getByRole("link", { name: "Profile: Test User" })).toBeVisible();
  const account = await storedAccount(phone);
  const stillValid = await account.read();
  await account.close();
  const me = await request.get("http://localhost:8080/api/v1/me", {
    headers: { Authorization: `Bearer ${stillValid.access_token as string}` },
  });
  expect(me.status(), "the phone's access token died with the laptop's sign-out").toBe(200);

  // The phone signs out cleanly too — Keycloak still recognises its id_token_hint.
  await phone.getByRole("button", { name: "Sign out" }).click();
  await expect(phone.getByText("Do you want to log out?")).toHaveCount(0);
  await expect(phone.getByRole("button", { name: "Sign in" })).toBeVisible();

  await Promise.all(contexts.map((context) => context.close()));
});

// A corrupt refresh token deterministically provokes the `invalid_grant` an
// idle-timed-out SSO session produces, which must end the local session (ADR-0029).
test("ends the local session when Keycloak rejects the refresh token", async ({ page }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount(page);
  await account.patch({
    expires_at: Math.floor(Date.now() / 1000) - 1,
    refresh_token: "no-longer-a-valid-grant",
  });
  await account.close();

  // First load deletes the session record; the cookie can't clear mid-render,
  // so the second load is the one that renders signed-out (endLocalSession.ts).
  await page.goto("/en/beers");
  await page.goto("/en");

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toHaveCount(0);
});

// Regression guard for ADR-0031: verified to fail without the realm's
// `backchannel.logout.url` wired up. Retries since backchannel timing isn't a contract.
test("Keycloak ending the SSO session ends the matching Kalia session", async ({ page, request }) => {
  await page.goto("/en");
  await signIn(page);

  await endKeycloakSessionViaAdmin(request);

  await expect(async () => {
    await page.goto("/en");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  }).toPass({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toHaveCount(0);
});
