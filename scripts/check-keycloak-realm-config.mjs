#!/usr/bin/env node

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

// Asserts against the realm keycloak-config-cli actually applied, not
// against keycloak/realm-export.json's source text — a broken $(env:...)
// substitution or an unresolved variable is exactly what this exists to
// catch (ADR-0054), and reading the file back would miss both.
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

const kaliaFrontendClient = async (token) => {
  const url = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients`);
  url.searchParams.set("clientId", "kalia-frontend");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`could not look up client kalia-frontend: ${response.status} ${await response.text()}`);
  }
  const [client] = await response.json();
  if (!client) {
    throw new Error(`realm ${REALM} has no client kalia-frontend`);
  }
  return client;
};

const checkRealmConfig = async () => {
  const token = await adminToken();
  const client = await kaliaFrontendClient(token);

  const expectedRedirectUri = `${FRONTEND_URL}/*`;
  const expectedPostLogoutUri = `${FRONTEND_URL}/*`;

  const mismatches = [];
  if (!client.redirectUris?.includes(expectedRedirectUri)) {
    mismatches.push(`redirectUris ${JSON.stringify(client.redirectUris)} does not contain ${JSON.stringify(expectedRedirectUri)}`);
  }
  if (!client.webOrigins?.includes(FRONTEND_URL)) {
    mismatches.push(`webOrigins ${JSON.stringify(client.webOrigins)} does not contain ${JSON.stringify(FRONTEND_URL)}`);
  }
  if (client.attributes?.["post.logout.redirect.uris"] !== expectedPostLogoutUri) {
    mismatches.push(`post.logout.redirect.uris ${JSON.stringify(client.attributes?.["post.logout.redirect.uris"])} !== ${JSON.stringify(expectedPostLogoutUri)}`);
  }

  if (mismatches.length > 0) {
    throw new Error(
      `realm ${REALM}'s kalia-frontend client does not match FRONTEND_URL=${FRONTEND_URL}:\n  ${mismatches.join("\n  ")}`,
    );
  }
};

// Retries for the same reason check-keycloak-signin.mjs does: the caller's
// `docker compose up` for keycloak-seed already waits for keycloak-config to
// exit successfully, but the admin API can still answer a transient error in
// the moment right after.
const attempts = 15;
const delayMs = 2000;
let lastError;
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    await checkRealmConfig();
    console.log(`Keycloak realm ${REALM}'s kalia-frontend client matches FRONTEND_URL=${FRONTEND_URL}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

console.error(lastError.message);
process.exit(1);
