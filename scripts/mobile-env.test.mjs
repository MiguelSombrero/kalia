#!/usr/bin/env node
// Self-test for mobile-env.mjs. Runs in `make check`.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { mobileEnv } from "./mobile-env.mjs";
import { ROOT, stackEnv } from "./stack-ports.mjs";

test("the origins and Metro's port follow the ports the stack's .env gives", () => {
  assert.deepEqual(mobileEnv({ BACKEND_PORT: "8580", KEYCLOAK_PORT: "8581", METRO_PORT: "8582" }), {
    EXPO_PUBLIC_API_ORIGIN: "http://localhost:8580",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://localhost:8581",
    RCT_METRO_PORT: "8582",
    REACT_NATIVE_PACKAGER_HOSTNAME: "localhost",
  });
});

test("an unset port is the stack's default", () => {
  assert.deepEqual(mobileEnv({}), {
    EXPO_PUBLIC_API_ORIGIN: "http://localhost:8080",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://localhost:8081",
    RCT_METRO_PORT: "8082",
    REACT_NATIVE_PACKAGER_HOSTNAME: "localhost",
  });
});

const PHONE = { KALIA_PHONE_HOST: "mac.example.ts.net", BACKEND_PORT: "8380", KEYCLOAK_PORT: "8381", METRO_PORT: "8382" };

test("in phone mode the API, Keycloak and Metro are the one host joined to the stack's own ports", () => {
  assert.deepEqual(mobileEnv(PHONE), {
    EXPO_PUBLIC_API_ORIGIN: "http://mac.example.ts.net:8380",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://mac.example.ts.net:8381",
    RCT_METRO_PORT: "8382",
    REACT_NATIVE_PACKAGER_HOSTNAME: "mac.example.ts.net",
  });
});

test("a blank KALIA_PHONE_HOST is phone mode off", () => {
  assert.deepEqual(mobileEnv({ ...PHONE, KALIA_PHONE_HOST: "  " }), mobileEnv({ ...PHONE, KALIA_PHONE_HOST: undefined }));
  assert.equal(mobileEnv({ KALIA_PHONE_HOST: "" }).EXPO_PUBLIC_API_ORIGIN, "http://localhost:8080");
});

test("phone mode uses the default ports when the stack sets none", () => {
  assert.deepEqual(mobileEnv({ KALIA_PHONE_HOST: "mac.example.ts.net" }), {
    EXPO_PUBLIC_API_ORIGIN: "http://mac.example.ts.net:8080",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://mac.example.ts.net:8081",
    RCT_METRO_PORT: "8082",
    REACT_NATIVE_PACKAGER_HOSTNAME: "mac.example.ts.net",
  });
});

test("the host comes from the root .env, and no committed file names one", () => {
  const root = mkdtempSync(join(tmpdir(), "mobile-env-"));
  try {
    writeFileSync(join(root, ".env"), "KALIA_PHONE_HOST=from-dotenv.example.ts.net\nBACKEND_PORT=8480\n");
    const env = mobileEnv(stackEnv({}, root));
    assert.equal(env.EXPO_PUBLIC_API_ORIGIN, "http://from-dotenv.example.ts.net:8480");
    assert.equal(env.REACT_NATIVE_PACKAGER_HOSTNAME, "from-dotenv.example.ts.net");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  for (const file of ["docker-compose.base.yml", "docker-compose.dev.env", "docker-compose.override.yml", "mobile/app.config.js", "mobile/package.json"]) {
    assert.doesNotMatch(readFileSync(join(ROOT, file), "utf8"), /\.ts\.net/, `${file} names a tailnet host`);
  }
});
