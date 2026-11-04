#!/usr/bin/env node
// Self-test for mobile-native.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TEAM_ID_VARIABLE } from "./mobile-doctor.mjs";
import { parseEmulators, reverseCalls } from "./mobile-native.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const withoutTeam = { ...process.env, [TEAM_ID_VARIABLE]: "" };

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

test("the script refuses an iPhone build without the Apple Team ID, naming it, before it probes a toolchain or builds", () => {
  const run = spawnSync("node", [resolve(ROOT, "scripts/mobile-native.mjs"), "ios-device"], { encoding: "utf8", env: withoutTeam });
  assert.equal(run.status, 1);
  assert.match(run.stdout, new RegExp(`FAIL ${TEAM_ID_VARIABLE}`));
  assert.doesNotMatch(run.stdout, /Xcode/);
});

test("make mobile-ios-device refuses the same way", () => {
  const run = spawnSync("make", ["--no-print-directory", "-C", ROOT, "mobile-ios-device"], { encoding: "utf8", env: withoutTeam });
  assert.notEqual(run.status, 0);
  assert.match(run.stdout, new RegExp(`FAIL ${TEAM_ID_VARIABLE}`));
});
