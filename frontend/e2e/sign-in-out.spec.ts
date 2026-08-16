// Lives under frontend/ but exercises the whole stack: the compose-run
// Keycloak and Valkey are the fixture behind every flow here
// (docs/architecture.md §6, §7). Credentials are the dev-only account seeded
// in keycloak/realm-export.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import Redis from "ioredis";

const USERNAME = "testuser";
const PASSWORD = "testuser123";

// Do not make these parallel while every spec signs in as the same realm user.
// Measured: 1-2 of 6 specs then fail, always one that cycles sign-in and
// sign-out, always with the browser landing back on Kalia still rendered signed
// in. Sequential sign-ins on two devices are fine; overlapping authentication
// flows for one realm user are not. Seed a user per spec first.
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
 * Reads and rewrites the token set stored for one browser's session, which is
 * how the refresh tests below reach an expiry that would otherwise take five
 * minutes of wall clock (the realm's `accessTokenLifespan`,
 * keycloak/realm-export.json). Addressed by the page's own session cookie:
 * records are keyed per session (ADR-0030), so several may exist at once even
 * though the realm seeds a single user.
 */
const storedAccount = async (page: Page) => {
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find((cookie) => cookie.name === "authjs.session-token")?.value;
  expect(sessionToken, "the page carries no Auth.js session cookie").toBeTruthy();

  const valkey = new Redis("redis://localhost:6379");
  const key = `auth:session-account:${sessionToken}`;
  const read = async () => JSON.parse((await valkey.get(key))!) as Record<string, unknown>;
  return {
    read,
    // KEEPTTL, or the patch itself would strip the expiry the record is
    // supposed to carry and quietly test something production never does.
    patch: async (fields: Record<string, unknown>) =>
      valkey.set(key, JSON.stringify({ ...(await read()), ...fields }), "KEEPTTL"),
    close: () => valkey.quit(),
  };
};

/**
 * Ends `testuser`'s Keycloak SSO session from the identity-provider side —
 * an admin revoking a session, or another RP's own logout, would look the
 * same to Kalia — so Back-Channel Logout (ADR-0031) is the only thing that
 * can end the matching Kalia session; nothing in this flow visits Kalia at
 * all before the assertion in the test that calls this.
 */
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
 * One click is the assertion. `form-action 'self'` blocks a form navigation
 * that ends up cross-origin, including via a same-origin route's redirect, and
 * a blocked sign-out has already deleted the local session — so a second click
 * completes and the flow looks fine while Keycloak's SSO session survives
 * (ADR-0025). Only the click count catches that.
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
 * Two cycles are the point — a single one passes even when the stored tokens
 * are stale, because staleness only shows from the second sign-out on: the
 * `id_token_hint` then names a Keycloak session that no longer exists, and
 * Keycloak answers with its own "Do you want to log out?" page instead of
 * completing the logout (ADR-0025).
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
 * The renewed token is sent to the real backend rather than merely compared as
 * a string: withholding an expired token also keeps browsing working, so only
 * a call the resource server accepts distinguishes renewal from that
 * (ADR-0029).
 */
test("renews an expired access token instead of dropping it", async ({ page, request }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount(page);
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
 * Two browser contexts are the point — a single one cannot detect tokens
 * shared between sessions, so collapsing this into one page deletes the guard
 * without failing (ADR-0030).
 */
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

  // The laptop's own Keycloak SSO session is the one that ended, so it is
  // asked for credentials again rather than being signed straight back in.
  await laptop.getByRole("button", { name: "Sign in" }).click();
  await expect(
    laptop.locator("#username"),
    "the laptop stayed authenticated at Keycloak, so the wrong session was ended",
  ).toBeVisible();

  // The phone never signed out, and its tokens are still its own and usable.
  await phone.reload();
  await expect(phone.getByText("Hi, Test User")).toBeVisible();
  const account = await storedAccount(phone);
  const stillValid = await account.read();
  await account.close();
  const me = await request.get("http://localhost:8080/api/v1/me", {
    headers: { Authorization: `Bearer ${stillValid.access_token as string}` },
  });
  expect(me.status(), "the phone's access token died with the laptop's sign-out").toBe(200);

  // And the phone can still sign itself out cleanly — its id_token_hint names
  // a session Keycloak still recognises, so no confirmation page.
  await phone.getByRole("button", { name: "Sign out" }).click();
  await expect(phone.getByText("Do you want to log out?")).toHaveCount(0);
  await expect(phone.getByRole("button", { name: "Sign in" })).toBeVisible();

  await Promise.all(contexts.map((context) => context.close()));
});

/**
 * A corrupt refresh token is the deterministic way to provoke the
 * `invalid_grant` an idle-timed-out SSO session produces, which is the one
 * failure that must end the local session rather than leaving a signed-in user
 * who can reach nothing (ADR-0029).
 */
test("ends the local session when Keycloak rejects the refresh token", async ({ page }) => {
  await page.goto("/en");
  await signIn(page);

  const account = await storedAccount(page);
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

/**
 * Regression guard for ADR-0031's Back-Channel Logout: without the realm's
 * `backchannel.logout.url` attribute wired up (keycloak/realm-export.json),
 * nothing tells Kalia a Keycloak-side logout happened and the local session
 * lives on regardless — verified to fail without that attribute. Keycloak
 * calls the backchannel logout endpoint as part of processing the admin
 * request below, but the exact timing relative to that call returning isn't
 * a contract this test should assume, hence the retry.
 */
test("Keycloak ending the SSO session ends the matching Kalia session", async ({ page, request }) => {
  await page.goto("/en");
  await signIn(page);

  await endKeycloakSessionViaAdmin(request);

  await expect(async () => {
    await page.goto("/en");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  }).toPass({ timeout: 15_000 });
  await expect(page.getByText("Hi, Test User")).toHaveCount(0);
});
