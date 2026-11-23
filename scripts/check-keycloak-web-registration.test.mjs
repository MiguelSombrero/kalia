#!/usr/bin/env node
// Self-test for the pure parts of check-keycloak-web-registration.mjs, so a
// verdict that stopped telling a refusal from an acceptance fails here
// rather than passing against a realm that accepts everything. The checks
// themselves need a live Keycloak (`make keycloak-check`).

import test from "node:test";
import assert from "node:assert/strict";

import { logoutUrl, refusedForPkce, refusedForRedirect } from "./check-keycloak-web-registration.mjs";

const response = (status, location) => ({
  status,
  headers: { get: (name) => (name.toLowerCase() === "location" ? (location ?? null) : null) },
});

test("a 400 page with no redirect is a refused redirect URI", () => {
  assert.equal(refusedForRedirect(response(400)), undefined);
});

test("the sign-in page, or a redirect onward, is not a refused redirect URI", () => {
  assert.match(refusedForRedirect(response(200)), /answered 200/);
  assert.match(refusedForRedirect(response(302, "https://kc/login")), /answered 302/);
  assert.match(refusedForRedirect(response(400, "https://kc/x")), /answered 400/);
});

test("a redirect carrying error=invalid_request is a refused PKCE request", () => {
  assert.equal(refusedForPkce(response(302, "https://web/cb?error=invalid_request&state=x")), undefined);
  assert.equal(refusedForPkce(response(400)), undefined);
});

test("the sign-in page and an issued code are not a refused PKCE request", () => {
  assert.match(refusedForPkce(response(200)), /sign-in page/);
  assert.match(refusedForPkce(response(302, "https://web/cb?code=abc")), /issued a code/);
});

test("a redirect with another error is not a refused PKCE request", () => {
  assert.match(refusedForPkce(response(302, "https://web/cb?error=server_error")), /answered 302/);
});

test("logoutUrl names the client and the address to return to", () => {
  const url = logoutUrl("http://web/");
  assert.equal(url.searchParams.get("client_id"), "kalia-web");
  assert.equal(url.searchParams.get("post_logout_redirect_uri"), "http://web/");
  assert.match(url.pathname, /\/protocol\/openid-connect\/logout$/);
});
