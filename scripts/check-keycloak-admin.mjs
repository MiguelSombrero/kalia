#!/usr/bin/env node
// Asserts, against the running realm, what ADR-0101 relies on: the admin role
// reaches the web client's access token and never the mobile client's, however
// the app asks for scopes; an ordinary user's web token and a new account's
// carry no admin role; and the `roles` client scope that writes
// `realm_access.roles` is a default scope of `kalia-web` and of nothing the
// app holds. The web client's token is read through Keycloak's scope
// evaluation (the web client signs in through a browser); the mobile client's
// is a real PKCE sign-in. With --backend the mobile token is also sent to the
// API: refused at /api/v1/admin/**, accepted where any token is, so the refusal
// is the role's absence and not a missing audience.
//
// The password is the one docker-compose.dev.env holds (KALIA_DEV_ADMIN_PASSWORD
// in the environment overrides it), so it is never spelled out a second time.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { audiencesOf, authorizationUrl, challengeFor, decodeJwtPayload, newVerifier, signIn } from "./check-keycloak-pkce-flow.mjs";
import { KEYCLOAK_ADMIN_URL, fetchToken, withRetry } from "./keycloak-admin.mjs";
import { ROOT, originOf, parseEnvFile, stackEnv } from "./stack-ports.mjs";

const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const MASTER_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const MASTER_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
export const ADMIN_ROLE = "admin";
export const WEB_CLIENT = "kalia-web";
export const MOBILE_CLIENT = "kalia-mobile";
export const ROLES_SCOPE = "roles";

export const rolesOf = (claims) => (Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : []);

/**
 * Problems with the client scopes of the two clients that sign in, each client
 * given as { default: [...], optional: [...] }: the web client carries `roles`
 * by default, so the claim reaches its token; the app's client carries it
 * neither by default nor as an optional scope, so no request for it can add it
 * (ADR-0101).
 */
export const clientScopeProblems = (scopesByClient) => {
  const problems = [];
  const web = scopesByClient[WEB_CLIENT];
  if (!(web?.default ?? []).includes(ROLES_SCOPE)) {
    problems.push(`"${ROLES_SCOPE}" is not a default client scope of ${WEB_CLIENT}, so its tokens carry no realm_access claim`);
  }
  const mobile = scopesByClient[MOBILE_CLIENT];
  if (!mobile) {
    problems.push(`no client scopes were read for ${MOBILE_CLIENT}`);
  } else {
    for (const kind of ["default", "optional"]) {
      if ((mobile[kind] ?? []).includes(ROLES_SCOPE)) {
        problems.push(`"${ROLES_SCOPE}" is a ${kind} client scope of ${MOBILE_CLIENT}, so its tokens can carry the admin role`);
      }
    }
    if (!(mobile.optional ?? []).includes("offline_access")) {
      problems.push(`"offline_access" is not an optional client scope of ${MOBILE_CLIENT}, so the app cannot ask for its offline token`);
    }
  }
  return problems;
};

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
const mobileTokens = (username, password, scope = "openid offline_access") => signIn({ username, password, scope });

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

const clientByClientId = async (master, clientId) => {
  const [client] = (await api(master, `/clients?clientId=${encodeURIComponent(clientId)}`)).body;
  expect(client, `no client ${clientId} in realm ${REALM}`);
  return client;
};

const userId = async (master, username) => {
  const [user] = (await api(master, `/users?username=${encodeURIComponent(username)}&exact=true`)).body;
  expect(user, `no user ${username} in realm ${REALM}`);
  return user.id;
};

// What kalia-web's access token would hold for the user: Keycloak's own
// evaluation of the client's scopes, the same mappers a browser sign-in runs.
const webToken = async (master, id) => {
  const client = await clientByClientId(master, WEB_CLIENT);
  const query = new URLSearchParams({ userId: id, scope: "openid" });
  return (await api(master, `/clients/${client.id}/evaluate-scopes/generate-example-access-token?${query}`)).body;
};

const run = async () => {
  const args = process.argv.slice(2);
  const withBackend = args.includes("--backend");
  const [adminUsername, username, password] = args.filter((arg) => !arg.startsWith("--"));
  const adminPassword = adminPasswordFrom(process.env, readFileSync(resolve(ROOT, "docker-compose.dev.env"), "utf8"));
  if (!adminUsername || !username || !password || !adminPassword) {
    console.error(
      "usage: node scripts/check-keycloak-admin.mjs <admin-username> <ordinary-username> <ordinary-password> [--backend]",
    );
    process.exit(1);
  }

  const master = await withRetry(masterToken, { attempts: 30, delayMs: 2000 });

  // Retried for the transient 503 right after Keycloak reports healthy, and for
  // keycloak-seed still running, as check-keycloak-signin.mjs does.
  await check(`${adminUsername}'s ${WEB_CLIENT} access token carries the ${ADMIN_ROLE} role`, async () => {
    const claims = await withRetry(async () => webToken(master, await userId(master, adminUsername)), {
      attempts: 30,
      delayMs: 2000,
    });
    expect(rolesOf(claims).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
  });

  await check(`${username}'s ${WEB_CLIENT} access token does not`, async () => {
    const claims = await webToken(master, await userId(master, username));
    expect(rolesOf(claims).length > 0, "the token carries no realm_access.roles at all, so its absence proves nothing");
    expect(!rolesOf(claims).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
  });

  let mobile;
  await check(`${adminUsername}'s ${MOBILE_CLIENT} access token (a real sign-in) carries no ${ADMIN_ROLE} role`, async () => {
    mobile = await withRetry(() => mobileTokens(adminUsername, adminPassword), { attempts: 30, delayMs: 2000 });
    const claims = decodeJwtPayload(mobile.access_token);
    expect(claims.azp === MOBILE_CLIENT, `azp is ${claims.azp}`);
    expect(!rolesOf(claims).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
    expect(
      audiencesOf(claims).includes("kalia-backend"),
      `aud is ${JSON.stringify(claims.aud)}: without the audience the backend refuses the token for every user`,
    );
  });

  // The scope is not among the client's, so Keycloak refuses the request; were
  // it to sign in anyway, the token must still hold no role.
  await check(`${MOBILE_CLIENT} cannot ask for the "${ROLES_SCOPE}" scope`, async () => {
    const url = authorizationUrl({ scope: `openid offline_access ${ROLES_SCOPE}`, challenge: challengeFor(newVerifier()) });
    const response = await fetch(url, { redirect: "manual" });
    if (response.status === 200) {
      const asked = decodeJwtPayload((await mobileTokens(adminUsername, adminPassword, url.searchParams.get("scope"))).access_token);
      expect(!rolesOf(asked).includes(ADMIN_ROLE), `realm_access.roles is ${JSON.stringify(rolesOf(asked))}`);
      return;
    }
    const location = new URL(response.headers.get("location") ?? "http://none.invalid/");
    expect(location.searchParams.get("error") === "invalid_scope", `answered ${response.status} ${location.search}`);
  });

  if (withBackend) {
    await check(`the API refuses that ${MOBILE_CLIENT} token at /api/v1/admin/** and accepts it elsewhere`, async () => {
      expect(mobile, "no mobile token was issued to send");
      const backend = originOf(stackEnv(), "BACKEND_PORT");
      const call = (path) => fetch(`${backend}${path}`, { headers: { Authorization: `Bearer ${mobile.access_token}` } });
      const open = await call("/api/v1/cellar");
      expect(open.status === 200, `GET /api/v1/cellar answered ${open.status}, so the token is not accepted at all`);
      const admin = await call("/api/v1/admin/suggestions");
      expect(admin.status === 403, `GET /api/v1/admin/suggestions answered ${admin.status}, not 403`);
    });
  }

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
    expect(id, `creating ${fresh} returned no Location header, so it cannot be cleaned up`);
    try {
      const claims = await webToken(master, id);
      expect(rolesOf(claims).includes("default-roles-kalia"), `realm_access.roles is ${JSON.stringify(rolesOf(claims))}`);
      expect(!rolesOf(claims).includes(ADMIN_ROLE), "a freshly created account's token carries the admin role");
      const defaults = (await api(master, "/roles/default-roles-kalia/composites")).body.map((role) => role.name);
      expect(!defaults.includes(ADMIN_ROLE), `the realm's default roles include it: ${JSON.stringify(defaults)}`);
    } finally {
      if (id) await api(master, `/users/${id}`, { method: "DELETE" });
    }
  });

  await check(`the "${ROLES_SCOPE}" client scope reaches ${WEB_CLIENT} and not ${MOBILE_CLIENT}`, async () => {
    const scopesByClient = {};
    for (const clientId of [WEB_CLIENT, MOBILE_CLIENT]) {
      const client = await clientByClientId(master, clientId);
      const names = async (kind) => (await api(master, `/clients/${client.id}/${kind}-client-scopes`)).body.map((scope) => scope.name);
      scopesByClient[clientId] = { default: await names("default"), optional: await names("optional") };
    }
    const problems = clientScopeProblems(scopesByClient);
    expect(problems.length === 0, problems.join("; "));
  });

  if (results.includes(false)) process.exit(1);
  console.log(`Keycloak realm ${REALM}: ${adminUsername} is an admin on the web only, ${username} and a new account are not`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
