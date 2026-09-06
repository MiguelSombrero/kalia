#!/usr/bin/env node
// Fixture-driven self-test for check-keycloak-realm-config.mjs. That check
// only runs with a live Keycloak (`make keycloak-check`), and on a stack
// keycloak-config just imported it passes trivially — so without this, a
// checker that had stopped detecting drift would stay green until someone
// hit real drift in the admin console. Runs in `make check` and CI's
// realm-config-checker-self-test job, beside check-glossary.test.mjs.

import test from "node:test";
import assert from "node:assert/strict";

import { resolvePlaceholders, diffRealm } from "./check-keycloak-realm-config.mjs";

const committedFixture = () => ({
  realm: "kalia",
  enabled: true,
  sslRequired: "$(env:KEYCLOAK_SSL_REQUIRED)",
  accessTokenLifespan: 300,
  smtpServer: {
    host: "$(env:KEYCLOAK_SMTP_HOST)",
    fromDisplayName: "Kalia",
    auth: "$(env:KEYCLOAK_SMTP_AUTH)",
    user: "$(env:KEYCLOAK_SMTP_USER)",
    password: "$(env:KEYCLOAK_SMTP_PASSWORD)",
  },
  clients: [
    {
      clientId: "kalia-frontend",
      publicClient: false,
      secret: "$(env:KALIA_FRONTEND_CLIENT_SECRET)",
      redirectUris: ["$(env:FRONTEND_URL)/*"],
      webOrigins: ["$(env:FRONTEND_URL)"],
      attributes: { "post.logout.redirect.uris": "$(env:FRONTEND_URL)/*" },
      protocolMappers: [
        { name: "kalia-backend-audience", config: { "included.client.audience": "kalia-backend" } },
      ],
    },
  ],
});

const liveFixture = () => ({
  realm: {
    realm: "kalia",
    enabled: true,
    sslRequired: "none",
    accessTokenLifespan: 300,
    // Keycloak drops the empty user, masks the password, and keeps the rest.
    smtpServer: { host: "mailpit", fromDisplayName: "Kalia", auth: "false", password: "**********" },
  },
  clients: {
    "kalia-frontend": {
      clientId: "kalia-frontend",
      publicClient: false,
      secret: "s3cr3t",
      redirectUris: ["http://localhost:3000/*"],
      webOrigins: ["http://localhost:3000"],
      // Keycloak adds attributes the file never mentions — must not register as drift.
      attributes: { "post.logout.redirect.uris": "http://localhost:3000/*", realm_client: "false" },
      protocolMappers: [
        {
          id: "generated-uuid",
          name: "kalia-backend-audience",
          consentRequired: false,
          config: { "included.client.audience": "kalia-backend", "access.token.claim": "true" },
        },
      ],
    },
  },
});

const env = {
  KEYCLOAK_SSL_REQUIRED: "none",
  FRONTEND_URL: "http://localhost:3000",
  KALIA_FRONTEND_CLIENT_SECRET: "s3cr3t",
  KEYCLOAK_SMTP_HOST: "mailpit",
  KEYCLOAK_SMTP_AUTH: "false",
  KEYCLOAK_SMTP_USER: "",
  KEYCLOAK_SMTP_PASSWORD: "",
};

test("resolvePlaceholders substitutes $(env:VAR) through nested structures", () => {
  const resolved = resolvePlaceholders(committedFixture(), env);
  assert.equal(resolved.sslRequired, "none");
  assert.equal(resolved.clients[0].redirectUris[0], "http://localhost:3000/*");
  assert.equal(resolved.clients[0].secret, "s3cr3t");
});

test("resolvePlaceholders honours a $(env:VAR:-default)", () => {
  assert.equal(resolvePlaceholders("$(env:MISSING:-fallback)", {}), "fallback");
});

test("resolvePlaceholders throws on an unset variable with no default", () => {
  assert.throws(() => resolvePlaceholders("$(env:KALIA_FRONTEND_CLIENT_SECRET)", {}), /unset and has no default/);
});

test("diffRealm passes when the live realm matches every pinned value", () => {
  const { mismatches, compared } = diffRealm(resolvePlaceholders(committedFixture(), env), liveFixture());
  assert.deepEqual(mismatches, []);
  assert.ok(compared > 0, "the check must actually compare something");
});

test("diffRealm ignores the masked smtpServer.password and an emptied smtp user", () => {
  // Committed password resolves to a real-looking value; live is always
  // "**********". Committed user resolves to "" (auth off); live omits it.
  const committed = resolvePlaceholders(committedFixture(), { ...env, KEYCLOAK_SMTP_PASSWORD: "an-app-password" });
  const { mismatches } = diffRealm(committed, liveFixture());
  assert.deepEqual(mismatches, []);
});

test("diffRealm still catches an smtp host changed only in the admin console", () => {
  const live = liveFixture();
  live.realm.smtpServer.host = "smtp.evil.example";
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /realm\.smtpServer\.host: committed "mailpit" != live "smtp\.evil\.example"/);
});

test("diffRealm catches an smtp user set in the console where the file commits none", () => {
  const live = liveFixture();
  live.realm.smtpServer.user = "leaked@example.com";
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /realm\.smtpServer\.user: committed empty, live is "leaked@example\.com"/);
});

test("diffRealm catches a realm setting changed only in the admin console", () => {
  const live = liveFixture();
  live.realm.accessTokenLifespan = 999;
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /realm\.accessTokenLifespan: committed 300 != live 999/);
});

test("diffRealm catches a missing redirect URI", () => {
  const live = liveFixture();
  live.clients["kalia-frontend"].redirectUris = ["http://localhost:3000/*", "http://localhost:3000/extra"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /redirectUris.*does not list/s);
});

test("diffRealm catches a redirect URI added only in the admin console", () => {
  const live = liveFixture();
  live.clients["kalia-frontend"].redirectUris = ["http://evil.example/*"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  // The pinned URI is gone (1) and an unlisted one is present (1).
  assert.equal(mismatches.length, 2);
  assert.ok(mismatches.some((m) => /is missing.*localhost:3000/.test(m)));
  assert.ok(mismatches.some((m) => /evil\.example.*does not list/.test(m)));
});

test("diffRealm catches a protocol mapper added only in the admin console", () => {
  const live = liveFixture();
  live.clients["kalia-frontend"].protocolMappers.push({ id: "x", name: "sneaky-mapper", config: {} });
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /protocolMapper "sneaky-mapper": present live/);
});

test("diffRealm catches a protocol-mapper config change", () => {
  const live = liveFixture();
  live.clients["kalia-frontend"].protocolMappers[0].config["included.client.audience"] = "wrong-audience";
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /protocolMapper "kalia-backend-audience"/);
});

test("diffRealm catches a client that was deleted from the realm", () => {
  const live = liveFixture();
  delete live.clients["kalia-frontend"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /absent from the live realm/);
});

test("diffRealm reports zero comparisons for a spec that pins nothing", () => {
  const { compared } = diffRealm({ realm: "kalia" }, liveFixture());
  assert.equal(compared, 0);
});
