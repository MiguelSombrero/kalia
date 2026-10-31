#!/usr/bin/env node
// Self-test for mobile-e2e.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { MAESTRO_VERSION, maestroBinary, parseArgs, pickSimulators, verdict } from "./mobile-e2e.mjs";

test("no arguments run every platform", () => {
  assert.deepEqual(parseArgs([]), { command: "run", platform: "all", abi: undefined });
});

test("a command, a platform and an ABI are read from the arguments", () => {
  assert.deepEqual(parseArgs(["build", "--platform", "android", "--abi", "x86_64"]), {
    command: "build",
    platform: "android",
    abi: "x86_64",
  });
});

test("an unknown platform is refused", () => {
  assert.throws(() => parseArgs(["--platform", "windows"]), /--platform must be/);
});

test("the flow is not green when no platform ran, and says each one skipped and why", () => {
  const { ok, lines } = verdict([
    { platform: "ios", status: "skipped", reason: "iOS Simulator needs a Mac" },
    { platform: "android", status: "skipped", reason: "adb not found" },
  ]);
  assert.equal(ok, false);
  assert.match(lines.join("\n"), /ios: skipped — iOS Simulator needs a Mac/);
  assert.match(lines.join("\n"), /android: skipped — adb not found/);
  assert.match(lines.join("\n"), /No platform ran the flow/);
});

test("one platform passing and the other skipped is green, and says so", () => {
  const { ok, lines } = verdict([
    { platform: "ios", status: "passed" },
    { platform: "android", status: "skipped", reason: "adb not found" },
  ]);
  assert.equal(ok, true);
  assert.match(lines.join("\n"), /ios: flow ran and passed/);
  assert.match(lines.join("\n"), /android: skipped — adb not found/);
});

test("a failed platform fails the run even when another passed", () => {
  assert.equal(
    verdict([
      { platform: "ios", status: "passed" },
      { platform: "android", status: "failed", reason: "maestro exited with 1" },
    ]).ok,
    false,
  );
});

test("the simulators of a name come booted ones first, and unavailable ones not at all", () => {
  const listing = {
    devices: {
      "iOS-27": [
        { udid: "A", name: "iPhone 17", state: "Shutdown", isAvailable: true },
        { udid: "B", name: "iPhone 17", state: "Booted", isAvailable: true },
        { udid: "C", name: "iPhone 17 Pro", state: "Booted", isAvailable: true },
        { udid: "D", name: "iPhone 17", state: "Booted", isAvailable: false },
      ],
    },
  };
  assert.deepEqual(pickSimulators(listing, "iPhone 17").map((device) => device.udid), ["B", "A"]);
  assert.deepEqual(pickSimulators(listing, "A").map((device) => device.udid), ["A"]);
  assert.deepEqual(pickSimulators(listing, "iPad"), []);
});

test("Maestro is cached per version under the home directory", () => {
  assert.equal(maestroBinary("ci-home"), `ci-home/.cache/kalia/maestro/${MAESTRO_VERSION}/maestro/bin/maestro`);
});
