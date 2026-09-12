#!/usr/bin/env node

import { fetchToken, withRetry } from "./keycloak-admin.mjs";

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
  const accessToken = await fetchToken({
    realm: REALM,
    username,
    password,
    describeError: (status, text) => `Keycloak realm ${REALM} rejected sign-in for ${username}: ${status} ${text}`,
  });
  if (!accessToken) {
    throw new Error(`Keycloak realm ${REALM} accepted sign-in for ${username} but returned no access token`);
  }
};

// Retries so callers (make keycloak-check, CI's keycloak-realm-check) don't
// need their own polling loop: this covers both Keycloak's transient
// post-healthcheck "Bootstrap in progress" 503 and keycloak-seed still
// running (docker compose up doesn't wait for a one-shot service to
// finish). A genuinely rejected sign-in still fails once attempts run out.
try {
  await withRetry(trySignIn, { attempts: 30, delayMs: 2000 });
  console.log(`Keycloak realm ${REALM} accepts sign-in for ${username}`);
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
