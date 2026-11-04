#!/usr/bin/env node
// Self-test for mobile-build.mjs. Runs in `make check`. The host is invented.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PLATFORMS, VARIANTS, buildEnv, buildPlan, makeTarget, projectSteps, refusal } from "./mobile-build.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "example-mac";
const PHONE = { KALIA_PHONE_HOST: HOST };
const EVERY = PLATFORMS.flatMap((platform) => VARIANTS.map((variant) => ({ platform, variant })));

test("every build target prebuilds its platform and checks the result before it builds, whatever the project holds", () => {
  for (const { platform, variant } of EVERY) {
    const phone = platform === "ios-device" && variant === "release" ? PHONE : {};
    const { steps, problem } = buildPlan(phone, { platform, variant });
    assert.equal(problem, undefined, `${platform} ${variant}`);
    const native = platform === "android" ? "android" : "ios";
    assert.equal(steps.length, 3, `${platform} ${variant}`);
    assert.deepEqual(steps[0].args, ["run", `${native}:prebuild`, "--workspace", "mobile"], `${platform} ${variant}`);
    assert.match(steps[1].args.join(" "), new RegExp(`check-cleartext\\.mjs ${native}$`), `${platform} ${variant}`);
    assert.deepEqual(steps.slice(0, 2), projectSteps(platform));
  }
});

test("the prebuild is the same plain one on every run: no flag keeps an existing project", () => {
  for (const platform of PLATFORMS) {
    const args = projectSteps(platform)[0].args;
    assert.ok(!args.some((arg) => arg.startsWith("--") && arg !== "--workspace"));
  }
});

test("a release build is made with the release flags, a development build without them", () => {
  const ios = (variant) => buildPlan({}, { platform: "ios", variant }).steps.at(-1).args;
  const android = (variant) => buildPlan({}, { platform: "android", variant }).steps.at(-1).args;
  assert.deepEqual(ios("development"), ["run", "ios", "--workspace", "mobile", "--"]);
  assert.deepEqual(ios("release"), ["run", "ios", "--workspace", "mobile", "--", "--configuration", "Release", "--no-bundler"]);
  assert.deepEqual(android("development"), ["run", "android", "--workspace", "mobile", "--"]);
  assert.deepEqual(android("release"), ["run", "android", "--workspace", "mobile", "--", "--variant", "release", "--no-bundler"]);
});

test("extra flags follow the release flags", () => {
  const { steps } = buildPlan({}, { platform: "ios", variant: "release", args: ["--device", "iPhone 17e"] });
  assert.deepEqual(steps.at(-1).args.slice(-3), ["--no-bundler", "--device", "iPhone 17e"]);
});

test("the iPhone installs under the configuration of its variant", () => {
  assert.equal(buildPlan({}, { platform: "ios-device", variant: "development" }).steps.at(-1).configuration, "Debug");
  assert.equal(buildPlan(PHONE, { platform: "ios-device", variant: "release" }).steps.at(-1).configuration, "Release");
});

test("an Android build in phone mode stops before building, saying why and what to do", () => {
  for (const variant of VARIANTS) {
    const plan = buildPlan(PHONE, { platform: "android", variant });
    assert.deepEqual(plan.steps, []);
    assert.match(plan.problem, new RegExp(`${makeTarget("android", variant)} does not work in phone mode`));
    assert.match(plan.problem, /make phone-mode-off/);
    assert.equal(plan.problem.includes(HOST), false);
  }
});

test("the script itself exits non-zero with that message for Android in phone mode, before any toolchain probe", () => {
  for (const args of [["android"], ["android", "--release"]]) {
    const run = spawnSync("node", [resolve(ROOT, "scripts/mobile-native.mjs"), ...args], { encoding: "utf8", env: { ...process.env, KALIA_PHONE_HOST: HOST } });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /does not work in phone mode/);
    assert.equal(run.stdout, "");
  }
});

test("a release build on the iPhone needs phone mode, because its origins are fixed when it is built", () => {
  assert.match(refusal({}, { platform: "ios-device", variant: "release" }), /needs phone mode/);
  assert.equal(refusal(PHONE, { platform: "ios-device", variant: "release" }), undefined);
  assert.equal(refusal({}, { platform: "ios-device", variant: "development" }), undefined);
});

test("the simulators build in either mode, and an iOS Simulator build in phone mode dials the tailnet", () => {
  for (const variant of VARIANTS) {
    assert.equal(refusal({}, { platform: "ios", variant }), undefined);
    assert.equal(refusal(PHONE, { platform: "ios", variant }), undefined);
  }
  const env = buildEnv({ ...PHONE, BACKEND_PORT: "8280", KEYCLOAK_PORT: "8281" }, { platform: "ios", variant: "release" });
  assert.equal(env.EXPO_PUBLIC_API_ORIGIN, `http://${HOST}:8280`);
  assert.equal(env.EXPO_PUBLIC_KEYCLOAK_ORIGIN, `http://${HOST}:8281`);
  assert.equal(env.KALIA_PHONE_HOST, HOST);
});

test("only the Android release build carries the end-to-end flag, and it dials localhost", () => {
  for (const { platform, variant } of EVERY) {
    const env = buildEnv({}, { platform, variant });
    assert.equal(env.KALIA_E2E, platform === "android" && variant === "release" ? "1" : "", `${platform} ${variant}`);
    assert.equal(env.KALIA_PHONE_HOST, "");
  }
  assert.equal(buildEnv({}, { platform: "android", variant: "release" }).EXPO_PUBLIC_API_ORIGIN, "http://localhost:8080");
});

test("the make targets are named for platform and variant", () => {
  assert.equal(makeTarget("ios", "development"), "make mobile-ios");
  assert.equal(makeTarget("ios-device", "release"), "make mobile-ios-device-release");
  assert.equal(makeTarget("android", "release"), "make mobile-android-release");
});
