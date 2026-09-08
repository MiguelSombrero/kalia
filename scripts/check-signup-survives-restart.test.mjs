#!/usr/bin/env node
// Fixture-driven self-test for check-signup-survives-restart.mjs's two pure
// helpers. The check itself only runs with a live Keycloak, postgres and
// mailpit (`make keycloak-check`, CI's keycloak-realm-check job) — this
// pins the HTML-form and cookie-jar parsing that the rest of that flow
// depends on, without needing any of that running.

import test from "node:test";
import assert from "node:assert/strict";

import { extractFormAction, mergeCookies } from "./check-signup-survives-restart.mjs";

test("extractFormAction finds a form action and unescapes &amp;", () => {
  const html = `<html><body><form id="kc-register-form" action="https://kc.test/registrations?session_code=abc&amp;execution=123" method="post">`;
  assert.equal(extractFormAction(html), "https://kc.test/registrations?session_code=abc&execution=123");
});

test("extractFormAction throws without embedding the page body — a page in this flow can be the UPDATE_PASSWORD form", () => {
  const html = "<html><body>Invalid parameter: client_id</body></html>";
  assert.throws(() => extractFormAction(html), (error) => {
    assert.match(error.message, /page length 54/);
    assert.doesNotMatch(error.message, /Invalid parameter/);
    return true;
  });
});

test("mergeCookies stores the name=value pair from each Set-Cookie header, dropping attributes", () => {
  const headers = new Headers();
  headers.append("set-cookie", "AUTH_SESSION_ID=abc123; Path=/; HttpOnly");
  headers.append("set-cookie", "KC_RESTART=def456; Path=/; SameSite=None");
  const jar = new Map();

  mergeCookies(jar, headers);

  assert.deepEqual([...jar], [
    ["AUTH_SESSION_ID", "abc123"],
    ["KC_RESTART", "def456"],
  ]);
});

test("mergeCookies overwrites an existing cookie of the same name from a later response", () => {
  const jar = new Map([["AUTH_SESSION_ID", "stale"]]);
  const headers = new Headers();
  headers.append("set-cookie", "AUTH_SESSION_ID=fresh; Path=/");

  mergeCookies(jar, headers);

  assert.equal(jar.get("AUTH_SESSION_ID"), "fresh");
});
