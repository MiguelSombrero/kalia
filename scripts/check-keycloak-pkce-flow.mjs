#!/usr/bin/env node
// Signs in to the running realm as the public `kalia-mobile` client and
// asserts what the backend relies on (the `kalia-backend` audience, ADR-0028)
// and what ADR-0095 promises the client's registration (PKCE, an exact
// redirect). With --backend it also calls the API with the access token.
// The browser is played by hand: the last hop is a custom scheme no HTTP
// client could follow.

import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { KEYCLOAK_URL, withRetry } from "./keycloak-admin.mjs";
import { originOf, stackEnv } from "./stack-ports.mjs";

const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const CLIENT_ID = "kalia-mobile";
export const REDIRECT_URI = "kalia://auth/callback";
const OIDC = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect`;

const base64url = (buffer) => buffer.toString("base64url");

export const newVerifier = () => base64url(randomBytes(32));

export const challengeFor = (verifier) => base64url(createHash("sha256").update(verifier).digest());

export const authorizationUrl = ({ redirectUri = REDIRECT_URI, scope = "openid", challenge, method = "S256" }) => {
  const url = new URL(`${OIDC}/auth`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", base64url(randomBytes(12)));
  if (challenge) url.searchParams.set("code_challenge", challenge);
  if (challenge && method) url.searchParams.set("code_challenge_method", method);
  return url;
};

// Keycloak HTML-escapes the form's action URL, `&` included.
export const loginFormAction = (html) => {
  const form = html.match(/<form[^>]*id="kc-form-login"[^>]*>/);
  const action = form?.[0].match(/action="([^"]+)"/);
  return action ? action[1].replaceAll("&amp;", "&") : undefined;
};

export const decodeJwtPayload = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));

export const audiencesOf = (claims) => [claims.aud ?? []].flat();

const cookiesFrom = (response) => response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);

const get = (url, cookies = []) =>
  fetch(url, { redirect: "manual", headers: cookies.length ? { Cookie: cookies.join("; ") } : {} });

const locationOf = (response) => {
  const location = response.headers.get("location");
  return location ? new URL(location) : undefined;
};

export const signIn = async ({ username, password, scope = "openid", verifier = newVerifier() }) => {
  const start = await get(authorizationUrl({ scope, challenge: challengeFor(verifier) }));
  if (start.status !== 200) {
    throw new Error(`the authorization endpoint answered ${start.status}, not the sign-in page`);
  }
  const action = loginFormAction(await start.text());
  if (!action) throw new Error("the sign-in page carries no kc-form-login form");

  const submit = await fetch(action, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookiesFrom(start).join("; ") },
    body: new URLSearchParams({ username, password, credentialId: "" }),
  });
  const callback = locationOf(submit);
  if (!callback) throw new Error(`sign-in did not redirect (${submit.status}): wrong credentials?`);
  if (`${callback.protocol}//${callback.host}${callback.pathname}` !== REDIRECT_URI) {
    throw new Error(`sign-in redirected to ${callback.origin}${callback.pathname}, not ${REDIRECT_URI}`);
  }
  const code = callback.searchParams.get("code");
  if (!code) throw new Error(`the redirect carried no code: ${callback.search}`);

  const response = await fetch(`${OIDC}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error(`the code was not accepted: ${response.status} ${await response.text()}`);
  return response.json();
};

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const args = process.argv.slice(2);
  const withBackend = args.includes("--backend");
  const [username, password] = args.filter((arg) => !arg.startsWith("--"));
  if (!username || !password) {
    console.error("usage: node scripts/check-keycloak-pkce-flow.mjs <username> <password> [--backend]");
    process.exit(1);
  }

  let tokens;
  // Retried for the transient 503 right after Keycloak reports healthy, as
  // check-keycloak-signin.mjs does.
  await check("code flow with PKCE returns tokens on the kalia:// redirect", async () => {
    tokens = await withRetry(() => signIn({ username, password, scope: "openid offline_access" }), {
      attempts: 15,
      delayMs: 2000,
    });
    expect(tokens.access_token && tokens.refresh_token, "the response lacks an access or refresh token");
  });

  if (tokens) {
    const access = decodeJwtPayload(tokens.access_token);
    await check("the access token's aud includes kalia-backend", () =>
      expect(audiencesOf(access).includes("kalia-backend"), `aud is ${JSON.stringify(access.aud)}`));
    await check("the access token was issued to kalia-mobile", () =>
      expect(access.azp === CLIENT_ID, `azp is ${access.azp}`));
    await check("offline_access yields an offline refresh token", () => {
      const refresh = decodeJwtPayload(tokens.refresh_token);
      expect(refresh.typ === "Offline", `refresh token typ is ${refresh.typ}`);
    });

    if (withBackend) {
      await check("the backend accepts the access token", async () => {
        const url = `${originOf(stackEnv(), "BACKEND_PORT")}/api/v1/cellar`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        expect(response.status === 200, `GET ${new URL(url).pathname} answered ${response.status}`);
      });
    }
  }

  const challenge = challengeFor(newVerifier());
  const refusedRedirect = async (redirectUri) => {
    const response = await get(authorizationUrl({ redirectUri, challenge }));
    expect(response.status === 400, `answered ${response.status}, not 400`);
    expect(!response.headers.get("location"), "redirected instead of refusing");
  };
  await check("a redirect URI of another scheme is refused", () => refusedRedirect("https://evil.example/callback"));
  await check("another path under the kalia:// scheme is refused", () => refusedRedirect("kalia://auth/other"));
  await check("another host under the kalia:// scheme is refused", () => refusedRedirect("kalia://evil/callback"));
  await check("the bare kalia:// scheme is refused", () => refusedRedirect("kalia://"));
  await check("a case-changed redirect URI is refused", () => refusedRedirect("kalia://auth/Callback"));

  const refusedForPkce = async (url) => {
    const response = await get(url);
    const location = locationOf(response);
    expect(response.status !== 200, "showed the sign-in page");
    expect(!location?.searchParams.has("code"), "issued a code");
    expect(
      response.status === 400 || location?.searchParams.get("error") === "invalid_request",
      `answered ${response.status} ${location ?? ""}`,
    );
  };
  await check("a request without a code challenge is refused", () => refusedForPkce(authorizationUrl({})));
  await check("a request with the plain method is refused", () =>
    refusedForPkce(authorizationUrl({ challenge: "plain-challenge", method: "plain" })));

  const failed = results.filter((result) => !result.ok).length;
  if (failed > 0) {
    console.error(`${failed} of ${results.length} checks failed`);
    process.exit(1);
  }
  console.log(`${CLIENT_ID} signs in as the app will (${results.length} checks)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
