#!/usr/bin/env node
// Iteration 6.5 task 05's AC3: an account created through self-registration
// survives a Keycloak container restart and can still sign in afterwards —
// the persistence guarantee task 01 built, exercised by the feature that
// actually needs it. Drives the same HTTP flow
// frontend/e2e/sign-up.spec.ts drives through a browser (register ->
// VERIFY_EMAIL -> read Mailpit -> UPDATE_PASSWORD), but directly against
// Keycloak's endpoints: this job brings up postgres+keycloak+mailpit only,
// with no frontend container to point a browser at
// (.github/workflows/ci.yml's keycloak-realm-check job).
//
// Keycloak ties each step of this flow to a session cookie in addition to
// the execution/session_code/tab_id query params a form's own action URL
// carries, so this keeps a small manual cookie jar across requests rather
// than relying on fetch's redirect-following (which drops Set-Cookie
// headers from the hops in between).

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";
const CLIENT_ID = "kalia-frontend";
const REDIRECT_URI = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/api/auth/callback/keycloak-register`;

const stamp = Date.now();
const username = `restart-check-${stamp}`;
const email = `${username}@example.com`;
const password = "correct-horse-battery";

export const mergeCookies = (jar, headers) => {
  for (const cookie of headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const separator = pair.indexOf("=");
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
};

const request = async (jar, url, init = {}) => {
  const headers = new Headers(init.headers);
  if (jar.size > 0) {
    headers.set("Cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
  }
  const response = await fetch(url, { ...init, headers, redirect: "manual" });
  mergeCookies(jar, response.headers);
  return response;
};

// Never embeds the page body in its error: a page in this flow can be the
// UPDATE_PASSWORD form, and a validation error re-render is not a place to
// assume Keycloak never echoes a submitted value back.
export const extractFormAction = (html) => {
  const match = html.match(/<form[^>]*\baction="([^"]*)"/);
  if (!match) throw new Error(`no <form action="..."> found (page length ${html.length})`);
  return match[1].replace(/&amp;/g, "&");
};

// Follows a chain of Keycloak's own redirects (VERIFY_EMAIL consumed ->
// UPDATE_PASSWORD required action shown next) until a page actually renders,
// updating the cookie jar at each hop the way a browser would. Same
// no-body-in-errors rule as extractFormAction above.
const followToNextPage = async (jar, url) => {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const response = await request(jar, current);
    if (response.status === 200) return response.text();
    if (response.status >= 300 && response.status < 400) {
      current = new URL(response.headers.get("location"), current).toString();
      continue;
    }
    throw new Error(`unexpected ${response.status} following ${current}`);
  }
  throw new Error(`too many redirects starting from ${url}`);
};

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
  if (!response.ok) throw new Error(`could not obtain a Keycloak admin token: ${response.status}`);
  return (await response.json()).access_token;
};

const findUser = async (token) => {
  const response = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`could not look up ${username}: ${response.status}`);
  const [user] = await response.json();
  return user;
};

const register = async (jar) => {
  const registrationUrl = new URL(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/registrations`);
  registrationUrl.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "openid",
    redirect_uri: REDIRECT_URI,
  }).toString();

  const registerPage = await request(jar, registrationUrl.toString());
  if (registerPage.status !== 200) {
    throw new Error(`GET registration page returned ${registerPage.status}`);
  }
  console.log(`GET registration page: 200, cookies [${[...jar.keys()].join(", ")}]`);
  const action = extractFormAction(await registerPage.text());

  const submitted = await request(jar, action, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, email, firstName: "Restart", lastName: "Check" }),
  });
  // Confirmed against a live realm: Keycloak answers a valid registration
  // POST with 302 straight to the VERIFY_EMAIL required-action page, even
  // though the account it just created has no usable credential yet — it
  // never renders that page as this response's own body.
  if (submitted.status !== 302) {
    throw new Error(`registration POST returned ${submitted.status}, expected a redirect to the VERIFY_EMAIL page`);
  }
  // The Location URL is just routing state (execution/client_id/tab_id), not
  // a credential — safe to log unconditionally, and this is the only way to
  // tell a real VERIFY_EMAIL redirect apart from a 302 back to some other
  // page (e.g. the form itself, on a session/cookie mismatch this script
  // caused rather than Keycloak rejecting the registration outright).
  const location = submitted.headers.get("location");
  console.log(`registration POST: 302 -> ${location}, cookies [${[...jar.keys()].join(", ")}]`);
  if (!location || !location.includes("VERIFY_EMAIL")) {
    throw new Error(`registration POST redirected to ${location}, expected the VERIFY_EMAIL required-action page`);
  }
};

const waitForVerificationLink = async () => {
  // Twice frontend/e2e/support/mailpit.ts's 15s: this job brings the stack
  // up and registers immediately after, unlike the e2e job's Playwright
  // spec, which only gets here after the whole stack (frontend included)
  // has been up and warm for minutes.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?${new URLSearchParams({ query: `to:${email}` })}`);
    const { messages } = await search.json();
    if (messages[0]) {
      const detail = await (await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json();
      const body = detail.Text || detail.HTML;
      const link = body.match(/https?:\/\/[^\s"'<>)]+/);
      if (link) return link[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`no verification email reached mailpit for ${email} within 30s`);
};

const verifyEmailAndSetPassword = async (jar, link) => {
  const updatePasswordPage = await followToNextPage(jar, link);
  const action = extractFormAction(updatePasswordPage);

  const submitted = await request(jar, action, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "password-new": password, "password-confirm": password }),
  });
  // No response body in this error either, on the same reasoning as
  // extractFormAction/followToNextPage above: this POST's own request body
  // carried the password.
  if (submitted.status !== 302) {
    throw new Error(`UPDATE_PASSWORD POST returned ${submitted.status}, expected a redirect back to the app`);
  }
};

const trySignIn = async () => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", client_id: "admin-cli", username, password }),
  });
  // No response body here either: this request's own body carried the
  // password, same reasoning as the errors above.
  if (!response.ok) {
    throw new Error(`Keycloak rejected sign-in for ${username} after the restart: ${response.status}`);
  }
  if (!(await response.json()).access_token) {
    throw new Error(`Keycloak accepted sign-in for ${username} after the restart but returned no access token`);
  }
};

// Same retry shape as check-keycloak-signin.mjs: absorbs the boot window a
// production-mode restart takes, not just the container coming back.
const signInWithRetry = async () => {
  const attempts = 30;
  const delayMs = 2000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await trySignIn();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};

// Best-effort: called from the outer finally below on every exit path, not
// just success, so a step failing after registration (verification timeout,
// a rejected password, the restart itself, sign-in genuinely not surviving
// it) doesn't leave a restart-check-<timestamp> user in the persisted realm
// forever. Swallows its own errors so a cleanup failure never hides the
// original one.
const deleteIfExists = async () => {
  try {
    const token = await adminToken();
    const user = await findUser(token);
    if (user) {
      await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (error) {
    console.error(`cleanup: could not delete ${username}: ${error.message}`);
  }
};

const run = async () => {
  const jar = new Map();
  await register(jar);

  try {
    const link = await waitForVerificationLink();
    await verifyEmailAndSetPassword(jar, link);

    const token = await adminToken();
    const created = await findUser(token);
    if (!created) throw new Error(`${username} not found via the admin API right after registering`);
    if (created.requiredActions?.length) {
      throw new Error(`${username} still has requiredActions ${JSON.stringify(created.requiredActions)} before the restart`);
    }

    console.log(`registered and verified ${username}; restarting keycloak...`);
    execSync("docker compose restart keycloak", { stdio: "inherit" });

    await signInWithRetry();
    console.log(`${username} signs in after the restart — Keycloak's account persistence covers self-registered accounts too`);
  } finally {
    await deleteIfExists();
  }
};

// import.meta.main is still behind a flag on this Node; compare argv instead
// so the self-test can import extractFormAction/mergeCookies without running.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
