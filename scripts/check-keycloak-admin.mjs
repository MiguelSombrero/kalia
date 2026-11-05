#!/usr/bin/env node
// Asserts, against the running realm, what ADR-0101 relies on: the development
// admin's kalia-mobile access token (a real PKCE sign-in) carries the `admin`
// realm role and an ordinary user's does not; an account created now, as a
// self-registered one is, holds neither the role nor a default role that
// includes it; and the `roles` client scope that writes `realm_access.roles`
// is still a default scope of both clients that sign in. A client given an
// explicit scope list drops the claim and every admin is refused without an
// error, which no backend test can see.
//
// The password is the one docker-compose.dev.env holds (KALIA_DEV_ADMIN_PASSWORD
// in the environment overrides it), so it is never spelled out a second time.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { decodeJwtPayload, signIn } from "./check-keycloak-pkce-flow.mjs";
import { KEYCLOAK_ADMIN_URL, fetchToken, withRetry } from "./keycloak-admin.mjs";
import { ROOT, parseEnvFile } from "./stack-ports.mjs";

const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const MASTER_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const MASTER_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
export const ADMIN_ROLE = "admin";
export const SIGN_IN_CLIENTS = ["kalia-web", "kalia-mobile"];

export const rolesOf = (claims) => (Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : []);

/** Problems with the default client scopes of the clients that sign in, keyed by client id. */
export const defaultScopeProblems = (scopesByClient) =>
  SIGN_IN_CLIENTS.filter((clientId) => !(scopesByClient[clientId] ?? []).includes("roles")).map(
    (clientId) => `"roles" is not a default client scope of ${clientId}, so its tokens carry no realm_access claim`,
  );

export const adminPasswordFrom = (env, devEnvText) =>
  env.KALIA_DEV_ADMIN_PASSWORD || parseEnvFile(devEnvText).KALIA_DEV_ADMIN_PASSWORD;

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(true);
    console.log(`ok   ${name}`);
  } catch (error) {
    results.push(false);
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

// The real code flow as kalia-mobile, not the admin-cli password grant: admin-cli
// does not carry the `roles` scope, so its tokens have no realm_access claim
// whoever signs in, and a check on them would pass for the wrong reason.
const tokenFor = async (username, password) => decodeJwtPayload((await signIn({ username, password })).access_token);

const masterToken = () =>
  fetchToken({
    realm: "master",
    username: MASTER_USERNAME,
    password: MASTER_PASSWORD,
    describeError: (status, text) => `could not obtain a Keycloak admin token: ${status} ${text}`,
  });

const api = async (token, path, init = {}) => {
  const response = await fetch(`${KEYCLOAK_ADMIN_URL}/admin/realms/${REALM}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  const text = await response.text();
  return { body: text ? JSON.parse(text) : undefined, location: response.headers.get("location") };
};

const run = async () => {
  const [adminUsername, username, password] = process.argv.slice(2);
  const adminPassword = adminPasswordFrom(process.env, readFileSync(resolve(ROOT, "docker-compose.dev.env"), "utf8"));
  if (!adminUsername || !username || !password || !adminPassword) {
    console.error("usage: node scripts/check-keycloak-admin.mjs <admin-username> <ordinary-username> <ordinary-password>");
    process.exit(1);
  }

  // Retried for the transient 503 right after Keycloak reports healthy, and for
  // keycloak-seed still running, as check-keycloak-signin.mjs does.
  await check(`${adminUsername}'s access token carries the ${ADMIN_ROLE} role`, async () => {
    const claims = await withRetry(() => tokenFor(adminUsername, adminPassword), { attempts: 30, delayMs: 2000 });
    expect(rolesOf(claims).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
  });

  await check(`${username}'s access token does not`, async () => {
    const claims = await tokenFor(username, password);
    expect(rolesOf(claims).length > 0, "the token carries no realm_access.roles at all, so its absence proves nothing");
    expect(!rolesOf(claims).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
  });

  const master = await masterToken();

  await check("an account created now holds neither the role nor a default role that includes it", async () => {
    const fresh = `check-admin-${randomUUID().slice(0, 8)}`;
    const freshPassword = randomUUID();
    const created = await api(master, "/users", {
      method: "POST",
      body: JSON.stringify({
        username: fresh,
        enabled: true,
        email: `${fresh}@example.com`,
        emailVerified: true,
        firstName: "Check",
        lastName: "Admin",
        credentials: [{ type: "password", value: freshPassword, temporary: false }],
      }),
    });
    const id = created.location?.split("/").pop();
    try {
      const claims = await tokenFor(fresh, freshPassword);
      expect(rolesOf(claims).includes("default-roles-kalia"), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
      expect(!rolesOf(claims).includes(ADMIN_ROLE), "a freshly created account's token carries the admin role");
      const defaults = (await api(master, "/roles/default-roles-kalia/composites")).body.map((role) => role.name);
      expect(!defaults.includes(ADMIN_ROLE), `the realm's default roles include it: ${JSON.stringify(defaults)}`);
    } finally {
      if (id) await api(master, `/users/${id}`, { method: "DELETE" });
    }
  });

  await check('the "roles" client scope is a default scope of kalia-web and kalia-mobile', async () => {
    const scopesByClient = {};
    for (const clientId of SIGN_IN_CLIENTS) {
      const [client] = (await api(master, `/clients?clientId=${encodeURIComponent(clientId)}`)).body;
      expect(client, `no client ${clientId} in realm ${REALM}`);
      scopesByClient[clientId] = (await api(master, `/clients/${client.id}/default-client-scopes`)).body.map((scope) => scope.name);
    }
    const problems = defaultScopeProblems(scopesByClient);
    expect(problems.length === 0, problems.join("; "));
  });

  if (results.includes(false)) process.exit(1);
  console.log(`Keycloak realm ${REALM}: ${adminUsername} is an admin, ${username} and a new account are not`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
