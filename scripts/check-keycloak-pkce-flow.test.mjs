#!/usr/bin/env node
// Self-test for the pure parts of check-keycloak-pkce-flow.mjs. The flow
// itself needs a live Keycloak (`make keycloak-check`); these keep the
// pieces it is built from honest, so a wrong challenge or a mis-read login
// form fails here rather than as a puzzling refusal from the realm.

import test from "node:test";
import assert from "node:assert/strict";

import {
  REDIRECT_URI,
  audiencesOf,
  authorizationUrl,
  challengeFor,
  decodeJwtPayload,
  loginFormAction,
  newVerifier,
} from "./check-keycloak-pkce-flow.mjs";

test("challengeFor matches the S256 example in RFC 7636 appendix B", () => {
  assert.equal(
    challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("newVerifier is a fresh RFC 7636 verifier each time", () => {
  const verifier = newVerifier();
  assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.notEqual(verifier, newVerifier());
});

test("authorizationUrl asks for the code flow as kalia-mobile on the registered redirect", () => {
  const url = authorizationUrl({ challenge: "abc" });
  assert.equal(url.searchParams.get("client_id"), "kalia-mobile");
  assert.equal(url.searchParams.get("redirect_uri"), REDIRECT_URI);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge"), "abc");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("authorizationUrl sends neither challenge nor method when none is given", () => {
  const url = authorizationUrl({});
  assert.equal(url.searchParams.has("code_challenge"), false);
  assert.equal(url.searchParams.has("code_challenge_method"), false);
});

test("loginFormAction reads the form's action and undoes the HTML escaping of &", () => {
  const html = `<form id="kc-form-login" onsubmit="x" action="http://kc/realms/kalia/login-actions/authenticate?session_code=a&amp;tab_id=b" method="post">`;
  assert.equal(
    loginFormAction(html),
    "http://kc/realms/kalia/login-actions/authenticate?session_code=a&tab_id=b",
  );
});

test("loginFormAction finds nothing on a page without the sign-in form", () => {
  assert.equal(loginFormAction(`<form id="kc-register-form" action="http://kc/x">`), undefined);
});

test("decodeJwtPayload reads the claims of an unverified token", () => {
  const payload = Buffer.from(JSON.stringify({ aud: ["kalia-backend"], azp: "kalia-mobile" })).toString("base64url");
  assert.deepEqual(decodeJwtPayload(`header.${payload}.signature`), { aud: ["kalia-backend"], azp: "kalia-mobile" });
});

test("audiencesOf reads Keycloak's single-string audience as well as an array", () => {
  assert.deepEqual(audiencesOf({ aud: "account" }), ["account"]);
  assert.deepEqual(audiencesOf({ aud: ["account", "kalia-backend"] }), ["account", "kalia-backend"]);
  assert.deepEqual(audiencesOf({}), []);
});
