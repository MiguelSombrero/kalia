import { expect, request, test as base, type APIRequestContext, type Page } from "@playwright/test";

const KEYCLOAK_ADMIN_URL = "http://localhost:8081";
const REALM = "kalia";
const ACCOUNT_PASSWORD = "testuser123";

export type KeycloakAccount = { username: string; password: string };

export const keycloakAdminToken = async (apiRequest: APIRequestContext): Promise<string> => {
  const adminUsername = process.env.KEYCLOAK_ADMIN ?? "admin";
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

  const response = await apiRequest.post(
    `${KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token`,
    {
      form: {
        grant_type: "password",
        client_id: "admin-cli",
        username: adminUsername,
        password: adminPassword,
      },
    },
  );
  expect(response.ok(), "could not obtain a Keycloak admin token").toBeTruthy();
  const { access_token: adminToken } = (await response.json()) as { access_token: string };
  return adminToken;
};

export const findKeycloakUser = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  username: string,
): Promise<{ id: string } | undefined> => {
  const response = await apiRequest.get(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { username, exact: "true" },
  });
  expect(response.ok(), `could not look up Keycloak user ${username}`).toBeTruthy();
  const [user] = (await response.json()) as { id: string }[];
  return user;
};

export const endKeycloakSessionForUser = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  userId: string,
): Promise<void> => {
  const response = await apiRequest.post(
    `${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users/${userId}/logout`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  expect(response.ok(), "the admin logout call itself failed").toBeTruthy();
};

const resetKeycloakPassword = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  userId: string,
  password: string,
): Promise<void> => {
  const response = await apiRequest.put(
    `${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { type: "password", value: password, temporary: false },
    },
  );
  expect(response.ok(), `could not reset password for Keycloak user ${userId}`).toBeTruthy();
};

const createKeycloakUser = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  account: KeycloakAccount,
): Promise<boolean> => {
  const response = await apiRequest.post(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      username: account.username,
      enabled: true,
      email: `${account.username}@example.com`,
      emailVerified: true,
      firstName: "Test",
      lastName: "User",
      credentials: [{ type: "password", value: account.password, temporary: false }],
    },
  });
  return response.ok();
};

// Idempotent to the account's desired end state, not just its existence: a
// worker that finds the account already there (a prior run, or another
// worker) still resets its password, so a locally changed ACCOUNT_PASSWORD
// can't leave a stale account permanently unsignable-into.
const ensureKeycloakAccount = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  account: KeycloakAccount,
): Promise<void> => {
  const existing = await findKeycloakUser(apiRequest, adminToken, account.username);
  if (existing) {
    await resetKeycloakPassword(apiRequest, adminToken, existing.id, account.password);
    return;
  }

  if (await createKeycloakUser(apiRequest, adminToken, account)) {
    return;
  }

  // Lost a create race against another concurrent worker or Playwright
  // process claiming the same idempotent username; the winner's account
  // already carries the right password (ACCOUNT_PASSWORD is shared), so it's
  // enough that it exists now.
  const winner = await findKeycloakUser(apiRequest, adminToken, account.username);
  expect(winner, `could not create Keycloak user ${account.username}`).toBeTruthy();
};

export const signIn = async (page: Page, account: KeycloakAccount): Promise<void> => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(account.username);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: /^Profile: / })).toBeVisible();
};

// One account per worker, not per file: fullyParallel (playwright.config.ts)
// schedules describe-serial files onto whichever worker is free, so the
// identity has to be scoped to the worker, not the file, or two files on
// different workers still collide on one account. parallelIndex, not
// workerIndex: the latter is never reused for the life of the process (a
// worker restart after a crash gets a new one), so it would grow the
// provisioned-account pool past the worker count over a long or flaky run.
export const test = base.extend<object, { account: KeycloakAccount }>({
  account: [
    async ({}, use, workerInfo) => {
      const account: KeycloakAccount = {
        username: `e2e-worker-${workerInfo.parallelIndex}`,
        password: ACCOUNT_PASSWORD,
      };

      const apiRequest = await request.newContext();
      try {
        const adminToken = await keycloakAdminToken(apiRequest);
        await ensureKeycloakAccount(apiRequest, adminToken, account);
      } finally {
        await apiRequest.dispose();
      }

      await use(account);
    },
    { scope: "worker" },
  ],
});

export { expect };
