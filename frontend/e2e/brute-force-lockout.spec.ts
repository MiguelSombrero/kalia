// Deliberately locks a disposable account for real (docs/architecture.md §6,
// ADR-0061) — never the shared per-worker account (./support/keycloakAccount.ts),
// which every other spec on the same worker relies on staying signed-in-able.
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createKeycloakUser, keycloakAdminToken } from "./support/keycloakAccount";
import { KEYCLOAK_ORIGIN } from "./support/origins";

const REALM = "kalia";
const GOOD_PASSWORD = "brute-force-test-Pw1!";
const BAD_PASSWORD = "wrong-password";
const CLIENT_ID = "kalia-frontend";
const REDIRECT_URI = "http://localhost:3000/api/auth/callback/keycloak";

// realm-export.json: failureFactor 10, waitIncrementSeconds 60,
// quickLoginCheckMilliSeconds 1000. Spacing attempts past the quick-check
// window exercises the failureFactor threshold this task chose, rather than
// Keycloak's separate rapid-retry wait (which would otherwise trigger first).
const ATTEMPT_GAP_MS = 1_100;
const LOCKOUT_RECOVERY_WAIT_MS = 65_000;

test.setTimeout(150_000);

// admin-cli is a built-in client with direct access grants enabled, so this
// drives a real password check against the realm without a browser.
const attemptDirectSignIn = async (request: APIRequestContext, username: string, password: string) =>
  request.post(`${KEYCLOAK_ORIGIN}/realms/${REALM}/protocol/openid-connect/token`, {
    form: { grant_type: "password", client_id: "admin-cli", username, password },
    failOnStatusCode: false,
  });

// The token endpoint never reveals a lockout — Keycloak's own
// accountTemporarilyDisabledMessage is deliberately identical to the
// invalid-credentials one (ADR-0061). Only the browser login form shows the
// kalia theme's override, so this drives that form instead.
const submitBrowserSignIn = async (
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<{ redirected: boolean; feedback?: string }> => {
  const authUrl =
    `${KEYCLOAK_ORIGIN}/realms/${REALM}/protocol/openid-connect/auth` +
    `?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid`;
  const formPage = await request.get(authUrl);
  const html = await formPage.text();
  const actionMatch = html.match(/<form[^>]*\baction="([^"]*)"/);
  expect(actionMatch, "Keycloak's login page carried no form action").toBeTruthy();
  const action = actionMatch![1].replace(/&amp;/g, "&");

  const response = await request.post(action, {
    form: { username, password, credentialId: "" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  if (response.status() >= 300 && response.status() < 400) {
    return { redirected: true };
  }
  const body = await response.text();
  const feedbackMatch = body.match(/kc-feedback-text">\s*([^<]+)/);
  return { redirected: false, feedback: feedbackMatch?.[1]?.trim() };
};

test("locks the account after repeated failed sign-ins, says so, and recovers on its own", async ({ request }) => {
  const adminToken = await keycloakAdminToken(request);
  const username = `brute-force-e2e-${Date.now()}`;
  const created = await createKeycloakUser(request, adminToken, { username, password: GOOD_PASSWORD });
  expect(created, `could not create Keycloak user ${username}`).toBeTruthy();

  // Failures short of the threshold behave like ordinary invalid credentials.
  for (let attempt = 1; attempt <= 9; attempt++) {
    const response = await attemptDirectSignIn(request, username, BAD_PASSWORD);
    expect(response.status(), `attempt ${attempt} of 9 unexpectedly succeeded`).toBe(400);
    await new Promise((resolve) => setTimeout(resolve, ATTEMPT_GAP_MS));
  }

  // The 10th failure crosses failureFactor; Keycloak still answers this exact
  // request with the ordinary invalid-credentials error — the account locks
  // for the *next* attempt onward.
  const tenth = await attemptDirectSignIn(request, username, BAD_PASSWORD);
  expect(tenth.status(), "the 10th failed attempt unexpectedly succeeded").toBe(400);
  await new Promise((resolve) => setTimeout(resolve, ATTEMPT_GAP_MS));

  // Locked out now — told so directly, even supplying the *correct*
  // password, which proves the message is the lockout speaking rather than
  // a coincidentally-wrong credential.
  const lockedAttempt = await submitBrowserSignIn(request, username, GOOD_PASSWORD);
  expect(lockedAttempt.redirected, "signed in despite being locked out").toBe(false);
  expect(lockedAttempt.feedback).toContain("Too many failed sign-in attempts");

  // Recovers on its own once the wait elapses — no administrator action.
  await new Promise((resolve) => setTimeout(resolve, LOCKOUT_RECOVERY_WAIT_MS));
  const recovered = await attemptDirectSignIn(request, username, GOOD_PASSWORD);
  expect(recovered.ok(), "did not recover after the lockout wait elapsed").toBeTruthy();
  const { access_token: accessToken } = (await recovered.json()) as { access_token?: string };
  expect(accessToken).toBeTruthy();
});
