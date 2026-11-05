#!/usr/bin/env node
// Self-test for the pure parts of check-keycloak-admin.mjs, which otherwise
// only runs against a live Keycloak (`make keycloak-check`).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { adminPasswordFrom, defaultScopeProblems, rolesOf } from "./check-keycloak-admin.mjs";
import { REALM_FILE } from "./check-keycloak-realm-config.mjs";

test("rolesOf reads Keycloak's realm_access.roles and nothing malformed", () => {
  assert.deepEqual(rolesOf({ realm_access: { roles: ["admin", "offline_access"] } }), ["admin", "offline_access"]);
  for (const claims of [{}, { realm_access: "admin" }, { realm_access: { roles: "admin" } }, { realm_access: {} }]) {
    assert.deepEqual(rolesOf(claims), []);
  }
});

test("defaultScopeProblems accepts both clients carrying roles", () => {
  const scopes = ["web-origins", "roles", "profile"];
  assert.deepEqual(defaultScopeProblems({ "kalia-web": scopes, "kalia-mobile": scopes }), []);
});

test("defaultScopeProblems names each client that dropped roles, and a client that is absent", () => {
  const problems = defaultScopeProblems({ "kalia-web": ["profile", "email"] });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /kalia-web/);
  assert.match(problems[1], /kalia-mobile/);
});

test("adminPasswordFrom prefers the environment and falls back to the dev env file", () => {
  assert.equal(adminPasswordFrom({}, "A=1\nKALIA_DEV_ADMIN_PASSWORD=from-file\n"), "from-file");
  assert.equal(adminPasswordFrom({ KALIA_DEV_ADMIN_PASSWORD: "from-env" }, "KALIA_DEV_ADMIN_PASSWORD=from-file\n"), "from-env");
  assert.equal(adminPasswordFrom({}, "A=1\n"), undefined);
});

test("the realm file defines the admin role, grants it to no one and does not make it a default role", () => {
  const realm = JSON.parse(readFileSync(REALM_FILE, "utf8"));
  assert.deepEqual(
    realm.roles.realm.map((role) => role.name),
    ["admin"],
  );
  for (const role of realm.roles.realm) {
    assert.equal(role.composite, undefined, "a composite role could grant others");
  }
  assert.equal(realm.users, undefined, "the realm file seeds an account");
  assert.equal(realm.defaultRole, undefined, "the realm file replaces the default role");
  assert.equal(realm.defaultRoles, undefined, "the realm file lists default roles");
  assert.equal(realm.groups, undefined, "a group could carry the role to its members");
  assert.equal(JSON.stringify(realm).match(/"admin"/g).length, 1, 'only the role definition names "admin"');
});
