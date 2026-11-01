#!/usr/bin/env node
// Self-test for keycloak-admin.mjs's shared token-fetch/retry logic.
// fetchToken and withRetry only run for real against a live Keycloak (`make
// keycloak-check`, which exercises them through the three scripts that
// import them) — this pins their retry counting, exhaustion, and
// error-message plumbing against a stubbed fetch instead, the same reasoning
// as check-keycloak-realm-config.test.mjs. Runs in `make check`, hence CI.

import test from "node:test";
import assert from "node:assert/strict";

import { KEYCLOAK_ADMIN_URL, KEYCLOAK_URL, fetchToken, withRetry } from "./keycloak-admin.mjs";

test("withRetry returns the first successful result without retrying", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return "ok";
  }, { attempts: 5, delayMs: 0 });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries a failing function until it succeeds", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error(`fail ${calls}`);
    return "ok";
  }, { attempts: 5, delayMs: 0 });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("withRetry throws the last error once attempts are exhausted", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      throw new Error(`fail ${calls}`);
    }, { attempts: 3, delayMs: 0 }),
    /fail 3/,
  );
  assert.equal(calls, 3);
});

test("fetchToken returns the access token on a successful grant", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ access_token: "a-token" }) });
  try {
    const token = await fetchToken({
      realm: "kalia",
      username: "someone",
      password: "secret",
      describeError: () => "unreachable",
    });
    assert.equal(token, "a-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchToken throws the caller's own describeError message on a rejected grant", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => "invalid_grant" });
  try {
    await assert.rejects(
      fetchToken({
        realm: "kalia",
        username: "someone",
        password: "wrong",
        describeError: (status, text) => `rejected: ${status} ${text}`,
      }),
      /^Error: rejected: 401 invalid_grant$/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchToken asks the admin origin for the master realm and the public one for any other", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ access_token: "a-token" }) };
  };
  try {
    const grant = { username: "someone", password: "secret", describeError: () => "unreachable" };
    await fetchToken({ realm: "master", ...grant });
    await fetchToken({ realm: "kalia", ...grant });
    assert.deepEqual(urls, [
      `${KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token`,
      `${KEYCLOAK_URL}/realms/kalia/protocol/openid-connect/token`,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
