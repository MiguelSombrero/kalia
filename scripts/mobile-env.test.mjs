#!/usr/bin/env node
// Self-test for mobile-env.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { mobileEnv } from "./mobile-env.mjs";

test("the origins follow the ports the stack's .env gives", () => {
  assert.deepEqual(mobileEnv({ BACKEND_PORT: "8580", KEYCLOAK_PORT: "8581" }), {
    EXPO_PUBLIC_API_ORIGIN: "http://localhost:8580",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://localhost:8581",
  });
});

test("an unset port is the stack's default", () => {
  assert.deepEqual(mobileEnv({}), {
    EXPO_PUBLIC_API_ORIGIN: "http://localhost:8080",
    EXPO_PUBLIC_KEYCLOAK_ORIGIN: "http://localhost:8081",
  });
});
