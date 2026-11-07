#!/usr/bin/env node
// Self-test for the pure parts of check-keycloak-admin.mjs, which otherwise
// only runs against a live Keycloak (`make keycloak-check`).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { adminPasswordFrom, clientScopeProblems, rolesOf } from "./check-keycloak-admin.mjs";
import { REALM_FILE } from "./check-keycloak-realm-config.mjs";

test("rolesOf reads Keycloak's realm_access.roles and nothing malformed", () => {
  assert.deepEqual(rolesOf({ realm_access: { roles: ["admin", "offline_access"] } }), ["admin", "offline_access"]);
  for (const claims of [{}, { realm_access: "admin" }, { realm_access: { roles: "admin" } }, { realm_access: {} }]) {
    assert.deepEqual(rolesOf(claims), []);
  }
});

const WEB = { default: ["web-origins", "roles", "profile"], optional: ["offline_access"] };
const MOBILE = { default: ["web-origins", "profile"], optional: ["offline_access"] };

test("clientScopeProblems accepts roles on the web client and not on the app's", () => {
  assert.deepEqual(clientScopeProblems({ "kalia-web": WEB, "kalia-mobile": MOBILE }), []);
});

test("clientScopeProblems names a web client that dropped roles", () => {
  const problems = clientScopeProblems({ "kalia-web": { ...WEB, default: ["profile"] }, "kalia-mobile": MOBILE });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /kalia-web/);
});

test("clientScopeProblems names an app client that carries roles by default or can ask for it", () => {
  for (const kind of ["default", "optional"]) {
    const problems = clientScopeProblems({ "kalia-web": WEB, "kalia-mobile": { ...MOBILE, [kind]: [...MOBILE[kind], "roles"] } });
    assert.equal(problems.length, 1, kind);
    assert.match(problems[0], new RegExp(`${kind} client scope of kalia-mobile`));
  }
});

test("clientScopeProblems names an app client that lost offline_access, and one that was not read", () => {
  assert.match(
    clientScopeProblems({ "kalia-web": WEB, "kalia-mobile": { ...MOBILE, optional: [] } })[0],
    /offline_access/,
  );
  assert.match(clientScopeProblems({ "kalia-web": WEB })[0], /no client scopes were read for kalia-mobile/);
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

test("the realm file gives kalia-mobile an explicit scope list without roles, and kalia-web none", () => {
  const { clients } = JSON.parse(readFileSync(REALM_FILE, "utf8"));
  const mobile = clients.find((client) => client.clientId === "kalia-mobile");
  const web = clients.find((client) => client.clientId === "kalia-web");
  assert.ok(mobile.defaultClientScopes.length > 0, "an empty default list pins nothing");
  assert.ok(!mobile.defaultClientScopes.includes("roles"), "kalia-mobile carries roles by default");
  assert.deepEqual(mobile.optionalClientScopes, ["offline_access"]);
  assert.equal(web.defaultClientScopes, undefined, "kalia-web is meant to inherit the realm's default scopes");
  assert.equal(web.optionalClientScopes, undefined);
});
