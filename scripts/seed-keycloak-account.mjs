#!/usr/bin/env node

import { KEYCLOAK_ADMIN_PUBLIC_URL, KEYCLOAK_ADMIN_URL, fetchToken, withRetry } from "./keycloak-admin.mjs";

const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("usage: node scripts/seed-keycloak-account.mjs <username> <password>");
  process.exit(1);
}

const adminToken = () =>
  fetchToken({
    realm: "master",
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    describeError: (status, text) => `could not obtain a Keycloak admin token: ${status} ${text}`,
  });

const findUser = async (token) => {
  const url = new URL(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users`);
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
  const response = await fetch(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users/${userId}/reset-password`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "password", value: password, temporary: false }),
  });
  if (!response.ok) {
    throw new Error(`could not reset password for Keycloak user ${userId}: ${response.status} ${await response.text()}`);
  }
};

const createUser = async (token) => {
  const response = await fetch(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}/users`, {
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

// The admin console signs in against the master realm's frontend URL, which
// is the public edge's address unless the realm says otherwise, and the public
// edge does not serve the master realm (ADR-0090). Not keycloak-config-cli's:
// changing a realm's frontend URL changes the issuer of the token that tool
// holds, and its import then fails with a 401 on the first boot. Last, for
// the same reason: the token this script holds is stale once it changes.
const ensureAdminConsoleOrigin = async (token) => {
  const url = `${KEYCLOAK_ADMIN_URL}/admin/realms/master`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const read = await fetch(url, { headers });
  if (!read.ok) {
    throw new Error(`could not read the master realm: ${read.status} ${await read.text()}`);
  }
  const realm = await read.json();
  if (realm.attributes?.frontendUrl === KEYCLOAK_ADMIN_PUBLIC_URL) return;
  const write = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ attributes: { ...realm.attributes, frontendUrl: KEYCLOAK_ADMIN_PUBLIC_URL } }),
  });
  if (!write.ok) {
    throw new Error(`could not set the master realm's frontend URL: ${write.status} ${await write.text()}`);
  }
};

const ensureUser = async (token) => {
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

const ensureAccount = async () => {
  const token = await adminToken();
  await ensureUser(token);
  await ensureAdminConsoleOrigin(token);
};

// Keycloak's healthcheck can report ready a moment before master-realm
// bootstrap (KC_BOOTSTRAP_ADMIN_*) has finished, answering with a transient
// 503 "Bootstrap in progress" — this script's own depends_on
// (keycloak-config, ADR-0054) already waits out most of that window, but
// retry the whole operation anyway, not just the token request, since any
// step can still hit it. No catch here: an uncaught throw at exhaustion
// prints Node's own stack trace and exits non-zero, deliberately unlike
// check-keycloak-signin.mjs and check-keycloak-realm-config.mjs's clean
// one-line message — don't add one without also reconciling the wording.
await withRetry(ensureAccount, { attempts: 15, delayMs: 2000 });

console.log(`Keycloak account ${username} is present in realm ${REALM}`);
