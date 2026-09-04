import { expect, request, test as base, type APIRequestContext } from "@playwright/test";

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

const createKeycloakUser = async (
  apiRequest: APIRequestContext,
  adminToken: string,
  account: KeycloakAccount,
): Promise<void> => {
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
  expect(response.ok(), `could not create Keycloak user ${account.username}`).toBeTruthy();
};

// One account per worker, not per file: fullyParallel (playwright.config.ts)
// schedules describe-serial files onto whichever worker is free, so the
// identity has to be scoped to the worker, not the file, or two files on
// different workers still collide on one account.
export const test = base.extend<object, { account: KeycloakAccount }>({
  account: [
    async ({}, use, workerInfo) => {
      const account: KeycloakAccount = {
        username: `e2e-worker-${workerInfo.workerIndex}`,
        password: ACCOUNT_PASSWORD,
      };

      const apiRequest = await request.newContext();
      try {
        const adminToken = await keycloakAdminToken(apiRequest);
        const existing = await findKeycloakUser(apiRequest, adminToken, account.username);
        if (!existing) {
          await createKeycloakUser(apiRequest, adminToken, account);
        }
      } finally {
        await apiRequest.dispose();
      }

      await use(account);
    },
    { scope: "worker" },
  ],
});

export { expect };
export { KEYCLOAK_ADMIN_URL, REALM };
