#!/usr/bin/env node
// Shared password-grant-against-admin-cli token fetch and retry loop for
// seed-keycloak-account.mjs, check-keycloak-signin.mjs and
// check-keycloak-realm-config.mjs, plus a small CLI over the same two pieces
// for the ad-hoc realm reads/writes that verifying a realm task by hand used
// to rebuild from a curl+python3 one-liner each time.

import { fileURLToPath } from "node:url";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

// admin-cli is a built-in client of every realm (direct access grants enabled
// by default), so the same password grant serves both a master-realm admin
// token and an arbitrary user's sign-in check against the kalia realm.
// describeError lets each caller keep its own wording for a rejected grant
// instead of forcing one message on all three.
export const fetchToken = async ({ realm, username, password, describeError }) => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${realm}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", client_id: "admin-cli", username, password }),
  });
  if (!response.ok) {
    throw new Error(describeError(response.status, await response.text()));
  }
  const { access_token: token } = await response.json();
  return token;
};

// Rides out Keycloak's post-healthcheck "Bootstrap in progress" transient
// window (and, for callers racing a one-shot seed service, that service still
// running). Always throws the last error at exhaustion — never catches or
// exits itself — so each call site keeps its own exact message/exit-code
// behavior instead of all three converging on one shape.
export const withRetry = async (fn, { attempts, delayMs }) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

const adminToken = () =>
  withRetry(
    () =>
      fetchToken({
        realm: "master",
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        describeError: (status, text) => `could not obtain a Keycloak admin token: ${status} ${text}`,
      }),
    { attempts: 15, delayMs: 2000 },
  );

const authedRequest = async (token, path, init = {}) => {
  const response = await fetch(`${KEYCLOAK_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
};

const getRealm = (token) => authedRequest(token, `/admin/realms/${REALM}`);

const getClient = async (token, clientId) => {
  const clients = await authedRequest(token, `/admin/realms/${REALM}/clients?clientId=${encodeURIComponent(clientId)}`);
  const client = clients[0];
  if (!client) {
    throw new Error(`no client "${clientId}" in realm ${REALM}`);
  }
  return client;
};

const setRealmField = async (token, field, rawValue) => {
  const realm = await getRealm(token);
  realm[field] = parseValue(rawValue);
  await authedRequest(token, `/admin/realms/${REALM}`, { method: "PUT", body: JSON.stringify(realm) });
};

const setRedirectUri = async (token, action, clientId, uri) => {
  const client = await getClient(token, clientId);
  const uris = client.redirectUris ?? [];
  const redirectUris =
    action === "add" ? (uris.includes(uri) ? uris : [...uris, uri]) : uris.filter((existing) => existing !== uri);
  await authedRequest(token, `/admin/realms/${REALM}/clients/${client.id}`, {
    method: "PUT",
    body: JSON.stringify({ ...client, redirectUris }),
  });
};

const parseValue = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const getField = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);

const printValue = (value) => {
  console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

const usage = () => {
  console.error(
    "usage: node scripts/keycloak-admin.mjs get-realm [field]\n" +
      "       node scripts/keycloak-admin.mjs get-client <clientId> [field]\n" +
      "       node scripts/keycloak-admin.mjs set-realm <field> <value>\n" +
      "       node scripts/keycloak-admin.mjs redirect-uri add|remove <clientId> <uri>",
  );
  process.exit(1);
};

const run = async () => {
  const [verb, ...args] = process.argv.slice(2);
  const token = await adminToken();

  switch (verb) {
    case "get-realm": {
      const [field] = args;
      const realm = await getRealm(token);
      printValue(field ? getField(realm, field) : realm);
      return;
    }
    case "get-client": {
      const [clientId, field] = args;
      if (!clientId) usage();
      const client = await getClient(token, clientId);
      printValue(field ? getField(client, field) : client);
      return;
    }
    case "set-realm": {
      const [field, value] = args;
      if (!field || value === undefined) usage();
      await setRealmField(token, field, value);
      console.log(`realm ${REALM}: set ${field}`);
      return;
    }
    case "redirect-uri": {
      const [action, clientId, uri] = args;
      if ((action !== "add" && action !== "remove") || !clientId || !uri) usage();
      await setRedirectUri(token, action, clientId, uri);
      console.log(`client "${clientId}": ${action === "add" ? "added" : "removed"} redirect URI ${uri}`);
      return;
    }
    default:
      usage();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
