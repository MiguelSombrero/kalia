#!/usr/bin/env node

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("usage: node scripts/seed-keycloak-account.mjs <username> <password>");
  process.exit(1);
}

const requestAdminToken = async () => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!response.ok) {
    throw new Error(`could not obtain a Keycloak admin token: ${response.status} ${await response.text()}`);
  }
  const { access_token: token } = await response.json();
  return token;
};

// Keycloak's healthcheck can report ready a moment before master-realm
// bootstrap (KC_BOOTSTRAP_ADMIN_*) has finished, answering with a transient
// 503 "Bootstrap in progress" — seen in practice right after
// depends_on: condition: service_healthy is satisfied.
const adminToken = async (attempts = 10, delayMs = 2000) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await requestAdminToken();
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const findUser = async (token) => {
  const url = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`);
  url.searchParams.set("username", username);
  url.searchParams.set("exact", "true");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`could not look up Keycloak user ${username}: ${response.status} ${await response.text()}`);
  }
  const [user] = await response.json();
  return user;
};

const resetPassword = async (token, userId) => {
  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "password", value: password, temporary: false }),
  });
  if (!response.ok) {
    throw new Error(`could not reset password for Keycloak user ${userId}: ${response.status} ${await response.text()}`);
  }
};

const createUser = async (token) => {
  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      enabled: true,
      email: `${username}@example.com`,
      emailVerified: true,
      firstName: "Test",
      lastName: "User",
      credentials: [{ type: "password", value: password, temporary: false }],
    }),
  });
  return response.ok;
};

const token = await adminToken();
const existing = await findUser(token);
if (existing) {
  await resetPassword(token, existing.id);
} else if (!(await createUser(token))) {
  // Lost a create race against a concurrent invocation claiming the same
  // username; the winner already carries the desired password, so it's
  // enough that the account exists now.
  const winner = await findUser(token);
  if (!winner) {
    throw new Error(`could not create Keycloak user ${username}`);
  }
}

console.log(`Keycloak account ${username} is present in realm ${REALM}`);
