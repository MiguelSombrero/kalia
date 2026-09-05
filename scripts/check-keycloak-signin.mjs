#!/usr/bin/env node

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("usage: node scripts/check-keycloak-signin.mjs <username> <password>");
  process.exit(1);
}

// admin-cli is a built-in client of every realm (direct access grants
// enabled by default), so this exercises a real password grant against the
// realm's own token endpoint rather than asserting on container health.
const trySignIn = async () => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username,
      password,
    }),
  });
  if (!response.ok) {
    throw new Error(`Keycloak realm ${REALM} rejected sign-in for ${username}: ${response.status} ${await response.text()}`);
  }
  const { access_token: accessToken } = await response.json();
  if (!accessToken) {
    throw new Error(`Keycloak realm ${REALM} accepted sign-in for ${username} but returned no access token`);
  }
};

// Retries so callers (make keycloak-check, CI's keycloak-realm-check) don't
// need their own polling loop: this covers both Keycloak's transient
// post-healthcheck "Bootstrap in progress" 503 and keycloak-seed still
// running (docker compose up doesn't wait for a one-shot service to
// finish). A genuinely rejected sign-in still fails once attempts run out.
const attempts = 30;
const delayMs = 2000;
let lastError;
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    await trySignIn();
    console.log(`Keycloak realm ${REALM} accepts sign-in for ${username}`);
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
