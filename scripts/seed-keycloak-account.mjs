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

const adminToken = async () => {
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
  if (response.ok) {
    return true;
  }
  if (response.status === 409) {
    return false;
  }
  throw new Error(`could not create Keycloak user ${username}: ${response.status} ${await response.text()}`);
};

const ensureAccount = async () => {
  const token = await adminToken();
  const existing = await findUser(token);
  if (existing) {
    await resetPassword(token, existing.id);
    return;
  }
  if (await createUser(token)) {
    return;
  }
  // Lost a create race (409) against a concurrent invocation claiming the
  // same username; the winner already carries the desired password, so
  // it's enough that the account exists now.
  const winner = await findUser(token);
  if (!winner) {
    throw new Error(`could not create Keycloak user ${username}`);
  }
};

// Keycloak's healthcheck can report ready a moment before master-realm
// bootstrap (KC_BOOTSTRAP_ADMIN_*) has finished, answering with a transient
// 503 "Bootstrap in progress" — this script's own depends_on
// (keycloak-config, ADR-0054) already waits out most of that window, but
// retry the whole operation anyway, not just the token request, since any
// step can still hit it.
const attempts = 15;
const delayMs = 2000;
for (let attempt = 1; ; attempt++) {
  try {
    await ensureAccount();
    break;
  } catch (error) {
    if (attempt >= attempts) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

console.log(`Keycloak account ${username} is present in realm ${REALM}`);
