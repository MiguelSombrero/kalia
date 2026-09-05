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
  console.error(`Keycloak realm ${REALM} rejected sign-in for ${username}: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const { access_token: accessToken } = await response.json();
if (!accessToken) {
  console.error(`Keycloak realm ${REALM} accepted sign-in for ${username} but returned no access token`);
  process.exit(1);
}

console.log(`Keycloak realm ${REALM} accepts sign-in for ${username}`);
