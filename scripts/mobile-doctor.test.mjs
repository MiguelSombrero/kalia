#!/usr/bin/env node
// Self-test for mobile-doctor.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { ANDROID_API, diagnose, parseJdks } from "./mobile-doctor.mjs";

const healthy = () => ({
  pins: { xcode: "27.2", jdk: "17", node: "26" },
  node: "26.12.1",
  xcode: { version: "27.2", developerDir: "/Applications/Xcode.app/Contents/Developer" },
  iphoneSimulators: 3,
  pod: true,
  jdks: [
    { major: "25", home: "/jdk-25" },
    { major: "17", home: "/jdk-17" },
  ],
  android: {
    sdk: "/sdk",
    hasSdk: true,
    adb: true,
    emulator: true,
    platforms: [`android-${ANDROID_API}.0`],
    buildTools: [`${ANDROID_API}.0.0`],
    avds: [{ name: "Pixel_API", target: `android-${ANDROID_API}.0` }],
  },
  stack: { isWorktree: true, metroPort: "8282" },
});

const failures = (facts, platform) => diagnose(facts, platform).filter((finding) => !finding.ok);
const failureNames = (facts, platform) => failures(facts, platform).map((finding) => finding.tool);

test("a complete toolchain has no failure", () => {
  assert.deepEqual(failures(healthy()), []);
});

test("a missing JDK is reported by name, with the pinned major and what was found", () => {
  const facts = healthy();
  facts.jdks = [{ major: "25", home: "/jdk-25" }];
  const [finding] = failures(facts);
  assert.equal(finding.tool, "JDK 17");
  assert.match(finding.message, /25/);
  assert.match(finding.message, /zulu@17/);
});

test("no JDK at all is a failure too", () => {
  const facts = healthy();
  facts.jdks = [];
  assert.deepEqual(failureNames(facts), ["JDK 17"]);
});

test("a JDK newer than the pinned one does not satisfy it", () => {
  const facts = healthy();
  facts.jdks = [{ major: "27", home: "/jdk-27" }];
  assert.deepEqual(failureNames(facts), ["JDK 17"]);
});

test("Xcode older than the pinned version fails, newer within the major passes", () => {
  const facts = healthy();
  facts.xcode.version = "27.1";
  assert.deepEqual(failureNames(facts), ["Xcode 27.2"]);
  facts.xcode.version = "27.4";
  assert.deepEqual(failureNames(facts), []);
  facts.xcode.version = "28.0";
  assert.deepEqual(failureNames(facts), ["Xcode 27.2"]);
});

test("Xcode missing is reported, and so is a command-line-tools-only developer directory", () => {
  const facts = healthy();
  facts.xcode = { version: null, developerDir: null };
  assert.deepEqual(failureNames(facts), ["Xcode 27.2"]);
  facts.xcode = { version: "27.2", developerDir: "/Library/Developer/CommandLineTools" };
  assert.deepEqual(failureNames(facts), ["Xcode command-line tools"]);
});

test("no iPhone simulator and no CocoaPods are each reported", () => {
  const facts = healthy();
  facts.iphoneSimulators = 0;
  facts.pod = false;
  assert.deepEqual(failureNames(facts), ["iOS Simulator", "CocoaPods"]);
});

test("a missing Android SDK is reported once, not once per component", () => {
  const facts = healthy();
  facts.android = { ...facts.android, hasSdk: false, adb: false, emulator: false, platforms: [], buildTools: [], avds: [] };
  assert.deepEqual(failureNames(facts), ["Android SDK"]);
});

test("no message repeats the SDK location or the Metro port, which come from the environment", () => {
  const found = diagnose(healthy());
  const missing = diagnose({ ...healthy(), android: { ...healthy().android, hasSdk: false } });
  for (const finding of [...found, ...missing]) {
    assert.ok(!finding.message.includes("/sdk"), finding.message);
    assert.ok(!finding.message.includes("8282"), finding.message);
  }
});

test("each missing Android component is named", () => {
  const facts = healthy();
  facts.android = { ...facts.android, adb: false, emulator: false, platforms: [], buildTools: [] };
  assert.deepEqual(failureNames(facts), ["adb", "Android emulator", `Android ${ANDROID_API} platform`, "Android build-tools"]);
});

test("an emulator image of another API level is not the reference device", () => {
  const facts = healthy();
  facts.android.avds = [{ name: "Old", target: "android-30" }];
  assert.deepEqual(failureNames(facts), [`Android ${ANDROID_API} emulator image`]);
});

test("a worktree without a Metro port is told to run make stack-env", () => {
  const facts = healthy();
  facts.stack.metroPort = undefined;
  const [finding] = failures(facts);
  assert.equal(finding.tool, "METRO_PORT");
  assert.match(finding.message, /make stack-env/);
});

test("the main checkout needs no Metro port in its .env", () => {
  const facts = healthy();
  facts.stack = { isWorktree: false, metroPort: undefined };
  assert.deepEqual(failures(facts), []);
});

test("one platform's check ignores the other platform's tools", () => {
  const facts = healthy();
  facts.jdks = [];
  facts.pod = false;
  assert.deepEqual(failureNames(facts, "ios"), ["CocoaPods"]);
  assert.deepEqual(failureNames(facts, "android"), ["JDK 17"]);
});

test("parseJdks reads java_home -V, which prints the major first", () => {
  const output = `Matching Java Virtual Machines (3):
    27 (arm64) "Eclipse Adoptium" - "OpenJDK 27" /Library/Java/JavaVirtualMachines/temurin-27.jdk/Contents/Home
    17.0.21.0.3 (arm64) "Azul Systems, Inc." - "Zulu 17.70.113" /Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
    1.8.0_402 (x86_64) "Oracle" - "Java SE 8" /Library/Java/JavaVirtualMachines/jdk-1.8.jdk/Contents/Home

/Library/Java/JavaVirtualMachines/temurin-27.jdk/Contents/Home`;
  assert.deepEqual(parseJdks(output), [
    { major: "27", home: "/Library/Java/JavaVirtualMachines/temurin-27.jdk/Contents/Home" },
    { major: "17", home: "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home" },
    { major: "8", home: "/Library/Java/JavaVirtualMachines/jdk-1.8.jdk/Contents/Home" },
  ]);
});
