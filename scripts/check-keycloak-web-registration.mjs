#!/usr/bin/env node
// Asks the running realm what it accepts from `kalia-web` and asserts it
// refuses the rest: a request without a PKCE challenge, one with another
// method than S256, and a redirect or post-logout address outside the three
// paths the app uses (WEB_REDIRECT_PATHS, WEB_POST_LOGOUT_PATHS in
// check-keycloak-realm-config.mjs). The realm file says what is registered
// and the drift check says the realm holds it; this says Keycloak enforces it,
// as check-keycloak-pkce-flow.mjs does for `kalia-mobile`.

import { fileURLToPath } from "node:url";

import { authorizationUrl, challengeFor, get, locationOf, newVerifier } from "./check-keycloak-pkce-flow.mjs";
import { WEB_POST_LOGOUT_PATHS, WEB_REDIRECT_PATHS } from "./check-keycloak-realm-config.mjs";
import { KEYCLOAK_URL, withRetry } from "./keycloak-admin.mjs";
import { publicOriginOf, stackEnv } from "./stack-ports.mjs";

const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const CLIENT_ID = "kalia-web";
const LOGOUT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`;

export const logoutUrl = (postLogoutRedirectUri) => {
  const url = new URL(LOGOUT);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  return url;
};

// The sign-in page's status, and what a refusal looks like: Keycloak answers
// a refused redirect URI with its own 400 page, and a refused PKCE request by
// redirecting to the (valid) redirect URI with `error=invalid_request`.
export const refusedForRedirect = (response) =>
  response.status === 400 && !response.headers.get("location") ? undefined : `answered ${response.status}, not a 400 page`;

export const refusedForPkce = (response) => {
  const location = locationOf(response);
  if (response.status === 200) return "showed the sign-in page";
  if (location?.searchParams.has("code")) return "issued a code";
  return response.status === 400 || location?.searchParams.get("error") === "invalid_request"
    ? undefined
    : `answered ${response.status} ${location ?? ""}`;
};

const results = [];
const check = async (name, fn) => {
  try {
    const problem = await fn();
    if (problem) throw new Error(problem);
    results.push({ name, ok: true });
    console.log(`ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

const run = async () => {
  const origin = process.env.WEB_URL || publicOriginOf(stackEnv(), "WEB_PORT");
  const challenge = challengeFor(newVerifier());
  const [callback] = WEB_REDIRECT_PATHS.map((path) => `${origin}${path}`);
  const request = (parameters) => get(authorizationUrl({ clientId: CLIENT_ID, redirectUri: callback, challenge, ...parameters }));

  for (const path of WEB_REDIRECT_PATHS) {
    // Retried for the transient 503 right after Keycloak reports healthy.
    await check(`${path} is accepted with a PKCE challenge`, () =>
      withRetry(
        async () => {
          const response = await get(authorizationUrl({ clientId: CLIENT_ID, redirectUri: `${origin}${path}`, challenge }));
          if (response.status !== 200) throw new Error(`answered ${response.status}, not the sign-in page`);
        },
        { attempts: 15, delayMs: 2000 },
      ));
  }

  await check("a request without a code challenge is refused", async () =>
    refusedForPkce(await get(authorizationUrl({ clientId: CLIENT_ID, redirectUri: callback }))));
  await check("a request with the plain method is refused", async () =>
    refusedForPkce(await request({ challenge: "plain-challenge", method: "plain" })));

  const outside = [
    ["the web origin's home", `${origin}/`],
    ["a locale-prefixed home", `${origin}/en`],
    ["a path under a callback", `${origin}${WEB_REDIRECT_PATHS[0]}/extra`],
    ["a sibling of the callbacks", `${origin}/api/auth/callback/other`],
    ["another origin's callback", `https://evil.example${WEB_REDIRECT_PATHS[0]}`],
  ];
  for (const [label, redirectUri] of outside) {
    await check(`a redirect URI of ${label} is refused`, async () => refusedForRedirect(await request({ redirectUri })));
  }

  for (const path of WEB_POST_LOGOUT_PATHS) {
    await check(`post-logout ${path} is accepted`, async () => {
      const response = await get(logoutUrl(`${origin}${path}`));
      return response.status >= 400 ? `answered ${response.status} for the registered address` : undefined;
    });
  }
  for (const [label, uri] of [
    ["a locale-prefixed home", `${origin}/en`],
    ["a callback", callback],
    ["another origin", "https://evil.example/"],
  ]) {
    await check(`a post-logout redirect URI of ${label} is refused`, async () => refusedForRedirect(await get(logoutUrl(uri))));
  }

  const failed = results.filter((result) => !result.ok).length;
  if (failed > 0) {
    console.error(`${failed} of ${results.length} checks failed`);
    process.exit(1);
  }
  console.log(`${CLIENT_ID} refuses what it must (${results.length} checks)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
