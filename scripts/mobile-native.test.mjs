#!/usr/bin/env node
// Self-test for mobile-native.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { parseEmulators, reverseCalls } from "./mobile-native.mjs";

test("adb reverse forwards the API, Keycloak and Metro ports, each to itself, from the worktree's ports", () => {
  assert.deepEqual(reverseCalls({ BACKEND_PORT: "8280", KEYCLOAK_PORT: "8281", METRO_PORT: "8282" }), [
    ["reverse", "tcp:8280", "tcp:8280"],
    ["reverse", "tcp:8281", "tcp:8281"],
    ["reverse", "tcp:8282", "tcp:8282"],
  ]);
});

test("two worktrees' stacks reverse disjoint ports, and unset ports are the defaults", () => {
  const ports = (env) => reverseCalls(env).map(([, from]) => from);
  assert.deepEqual(ports({ BACKEND_PORT: "8180", KEYCLOAK_PORT: "8181", METRO_PORT: "8182" }), ["tcp:8180", "tcp:8181", "tcp:8182"]);
  assert.deepEqual(ports({}), ["tcp:8080", "tcp:8081", "tcp:8082"]);
});

test("only running emulators count as targets, not offline or physical devices", () => {
  const output = `List of devices attached
emulator-5554	device
emulator-5556	offline
R58M123ABC	device

`;
  assert.deepEqual(parseEmulators(output), ["emulator-5554"]);
});
