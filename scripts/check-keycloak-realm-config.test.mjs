#!/usr/bin/env node
// Fixture-driven self-test for check-keycloak-realm-config.mjs. That check
// only runs with a live Keycloak (`make keycloak-check`), and on a stack
// keycloak-config just imported it passes trivially — so without this, a
// checker that had stopped detecting drift would stay green until someone
// hit real drift in the admin console. Runs in `make check`, hence CI.

import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { DEV_REALM_FILE, REALM_FILE, diffRealm, mergeRealmFiles, resolvePlaceholders } from "./check-keycloak-realm-config.mjs";

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
      clientId: "kalia-web",
      publicClient: false,
      secret: "$(env:KALIA_WEB_CLIENT_SECRET)",
      redirectUris: ["$(env:WEB_URL)/*"],
      webOrigins: ["$(env:WEB_URL)"],
      attributes: { "post.logout.redirect.uris": "$(env:WEB_URL)/*" },
      protocolMappers: [
        { name: "kalia-backend-audience", config: { "included.client.audience": "kalia-backend" } },
      ],
    },
    {
      clientId: "kalia-swagger",
      redirectUris: ["$(env:BACKEND_PUBLIC_URL)/swagger-ui/oauth2-redirect.html"],
      webOrigins: ["$(env:BACKEND_PUBLIC_URL)"],
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
    "kalia-web": {
      clientId: "kalia-web",
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
    "kalia-swagger": {
      clientId: "kalia-swagger",
      redirectUris: ["http://localhost:8080/swagger-ui/oauth2-redirect.html"],
      webOrigins: ["http://localhost:8080"],
    },
  },
});

const env = {
  KEYCLOAK_SSL_REQUIRED: "none",
  WEB_URL: "http://localhost:3000",
  BACKEND_PUBLIC_URL: "http://localhost:8080",
  KALIA_WEB_CLIENT_SECRET: "s3cr3t",
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
  assert.throws(() => resolvePlaceholders("$(env:KALIA_WEB_CLIENT_SECRET)", {}), /unset and has no default/);
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
  live.clients["kalia-web"].redirectUris = ["http://localhost:3000/*", "http://localhost:3000/extra"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /redirectUris.*does not list/s);
});

test("diffRealm catches a redirect URI added only in the admin console", () => {
  const live = liveFixture();
  live.clients["kalia-web"].redirectUris = ["http://evil.example/*"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  // The pinned URI is gone (1) and an unlisted one is present (1).
  assert.equal(mismatches.length, 2);
  assert.ok(mismatches.some((m) => /is missing.*localhost:3000/.test(m)));
  assert.ok(mismatches.some((m) => /evil\.example.*does not list/.test(m)));
});

test("diffRealm catches a protocol mapper added only in the admin console", () => {
  const live = liveFixture();
  live.clients["kalia-web"].protocolMappers.push({ id: "x", name: "sneaky-mapper", config: {} });
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /protocolMapper "sneaky-mapper": present live/);
});

test("diffRealm catches a protocol-mapper config change", () => {
  const live = liveFixture();
  live.clients["kalia-web"].protocolMappers[0].config["included.client.audience"] = "wrong-audience";
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /protocolMapper "kalia-backend-audience"/);
});

test("diffRealm catches a client that was deleted from the realm", () => {
  const live = liveFixture();
  delete live.clients["kalia-web"];
  const { mismatches } = diffRealm(resolvePlaceholders(committedFixture(), env), live);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0], /absent from the live realm/);
});

test("diffRealm reports zero comparisons for a spec that pins nothing", () => {
  const { compared } = diffRealm({ realm: "kalia" }, liveFixture());
  assert.equal(compared, 0);
});

test("resolvePlaceholders builds the public addresses from the stack's host ports when they are not set", () => {
  const resolved = resolvePlaceholders(committedFixture(), { ...env, WEB_URL: undefined, BACKEND_PUBLIC_URL: undefined, WEB_PORT: "3100", BACKEND_PORT: "8180" });
  assert.equal(resolved.clients[0].redirectUris[0], "http://localhost:3100/*");
  assert.deepEqual(resolved.clients[1].redirectUris, ["http://localhost:8180/swagger-ui/oauth2-redirect.html"]);
  assert.deepEqual(resolved.clients[1].webOrigins, ["http://localhost:8180"]);
});

test("resolvePlaceholders keeps today's addresses when no port is set", () => {
  const resolved = resolvePlaceholders(committedFixture(), { ...env, WEB_URL: undefined, BACKEND_PUBLIC_URL: undefined });
  assert.equal(resolved.clients[0].redirectUris[0], "http://localhost:3000/*");
  assert.deepEqual(resolved.clients[1].webOrigins, ["http://localhost:8080"]);
});

test("diffRealm fails when the swagger redirect URI does not follow the backend port", () => {
  const committed = resolvePlaceholders(committedFixture(), { ...env, BACKEND_PUBLIC_URL: "http://localhost:8180" });
  const { mismatches } = diffRealm(committed, liveFixture());
  assert.ok(mismatches.some((m) => /kalia-swagger.*redirectUris.*oauth2-redirect/s.test(m)), mismatches.join("\n"));
  assert.ok(mismatches.some((m) => /kalia-swagger.*webOrigins/s.test(m)));
});

// ADR-0089: the deployable realm is keycloak-config's default file alone, and
// a public client in it would mint kalia-backend tokens outside the BFF's
// session lifecycle. The dev stack's file is where such a client lives.
const readRealmFile = (path) => JSON.parse(readFileSync(path, "utf8"));

test("the deployable realm file pins no public client and no kalia-swagger", () => {
  const { clients } = readRealmFile(REALM_FILE);
  assert.deepEqual(
    clients.filter((client) => client.publicClient || client.clientId === "kalia-swagger").map((client) => client.clientId),
    [],
  );
});

test("the dev realm file carries kalia-swagger and nothing else", () => {
  const { realm, clients } = readRealmFile(DEV_REALM_FILE);
  assert.equal(realm, "kalia");
  assert.deepEqual(clients.map((client) => client.clientId), ["kalia-swagger"]);
});

test("mergeRealmFiles keeps the first file's realm settings and every file's clients", () => {
  const merged = mergeRealmFiles([
    { realm: "kalia", accessTokenLifespan: 300, clients: [{ clientId: "a" }] },
    { realm: "kalia", clients: [{ clientId: "b" }] },
  ]);
  assert.equal(merged.accessTokenLifespan, 300);
  assert.deepEqual(merged.clients.map((client) => client.clientId), ["a", "b"]);
});
