// Lives under frontend/ but exercises the whole stack: the compose-run
// Keycloak and Valkey are the fixture behind every flow here
// (docs/architecture.md §6, §7). Credentials are the dev-only account seeded
// in keycloak/realm-export.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import Redis from "ioredis";

const USERNAME = "testuser";
const PASSWORD = "testuser123";

// Serial, not parallel: these share server-side state two ways. Keycloak's
// SSO session is global to the realm user, and the stored Keycloak account —
// which holds the id_token a sign-out sends as its hint — is one record per
// user, so concurrent sign-ins would overwrite each other's tokens and make
// the assertions below flap.
test.describe.configure({ mode: "serial" });

/**
 * Records CSP violations the page reports, so a test can assert a flow was
 * not silently blocked. Re-registered per document, and a blocked navigation
 * leaves the document in place — which is exactly the case being guarded.
 */
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

/**
 * Reads and rewrites the stored Keycloak token set directly, which is how the
 * refresh tests below reach an expiry that would otherwise take five minutes
 * of wall clock (the realm's `accessTokenLifespan`, keycloak/realm-export.json).
 * There is exactly one account record because the realm seeds one user.
 */
const storedAccount = async () => {
  const valkey = new Redis("redis://localhost:6379");
  const [key] = await valkey.keys("auth:account:*");
  const read = async () => JSON.parse((await valkey.get(key))!) as Record<string, unknown>;
  return {
    read,
    patch: async (fields: Record<string, unknown>) =>
      valkey.set(key, JSON.stringify({ ...(await read()), ...fields })),
    close: () => valkey.quit(),
  };
};

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

/** Clicks "Sign in", completes Keycloak's form, and waits for Kalia to render signed-in. */
const signIn = async (page: Page) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Hi, Test User")).toBeVisible();
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
  await expect(page.getByText("Hi, Test User")).toHaveCount(0);
  expect((await scanForA11yViolations(page)).violations).toEqual([]);
});

/**
 * Regression guard: sign-out used to be a form POST to a route handler that
 * answered with a cross-origin redirect to Keycloak, which `form-action
 * 'self'` blocks. The navigation never happened, so the header still showed
 * "Sign out" after the click even though the session was already gone — hence
 * the single-click assertion here. Verified to fail against that build.
 */
test("signing out takes one click and is not blocked by the CSP", async ({ page }) => {
  const cspViolations = await collectCspViolations(page);
  await page.goto("/en");
  await signIn(page);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(await cspViolations()).toEqual([]);
});

/**
 * Regression guard: Auth.js links an account only once, so the stored tokens
 * used to freeze at the first sign-in. From the second sign-out on, the
 * `id_token_hint` named a Keycloak session that no longer existed, and
 * Keycloak answered with its own "Do you want to log out?" confirmation page
 * instead of completing the logout. Two cycles are the point — one passes
 * even with the bug present. Verified to fail against that build.
 */
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

    // The Keycloak SSO session must be gone too, or the next sign-in would
    // skip the credential prompt instead of showing Keycloak's form.
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.locator("#username"),
      `cycle ${cycle}: Keycloak did not re-prompt, so its SSO session survived`,
    ).toBeVisible();
    await page.goto("/en");
  }
});

/**
 * Iteration 4 task 8. Before silent refresh, `lib/api/accessToken.ts`
 * withheld an expired token so public browsing kept working, and every
 * protected call went out anonymous five minutes after sign-in.
 */
test("renews an expired access token instead of dropping it", async ({ page, request }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount();
  const before = await account.read();
  await account.patch({ expires_at: Math.floor(Date.now() / 1000) - 1 });

  // A page that actually calls the backend, so the token is fetched.
  await page.goto("/en/beers");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const after = await account.read();
  await account.close();

  expect(after.access_token, "the expired token was not replaced").not.toBe(before.access_token);
  expect(after.expires_at as number).toBeGreaterThan(Math.floor(Date.now() / 1000));

  // Not just "a new string": the renewed token must satisfy the resource
  // server's signature, issuer and audience checks (ADR-0028).
  const me = await request.get("http://localhost:8080/api/v1/me", {
    headers: { Authorization: `Bearer ${after.access_token as string}` },
  });
  expect(me.status(), "the backend rejected the renewed token").toBe(200);
});

/**
 * The security half of task 8: once Keycloak says the grant is gone, the
 * local session must go with it rather than presenting a signed-in user who
 * can reach nothing. A corrupt refresh token is the deterministic way to
 * provoke the `invalid_grant` that an idle-timed-out SSO session produces.
 */
test("ends the local session when Keycloak rejects the refresh token", async ({ page }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount();
  await account.patch({
    expires_at: Math.floor(Date.now() / 1000) - 1,
    refresh_token: "no-longer-a-valid-grant",
  });
  await account.close();

  // First load spends the dead refresh token and deletes the session record;
  // the cookie cannot be cleared mid-render, so the second load is the one
  // that renders signed-out (lib/auth/endLocalSession.ts).
  await page.goto("/en/beers");
  await page.goto("/en");

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Hi, Test User")).toHaveCount(0);
});
