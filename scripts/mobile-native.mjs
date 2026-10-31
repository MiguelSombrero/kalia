#!/usr/bin/env node
// Builds the development build and runs it on a simulator against this
// checkout's stack (`make mobile-ios`, `make mobile-android`):
//   node scripts/mobile-native.mjs ios|android [expo run flags]
// Every port comes from the worktree's .env through stack-ports.mjs. The iOS
// Simulator shares the Mac's network, so the app dials localhost directly; the
// Android emulator has a network of its own, so `adb reverse` forwards each
// port the app dials (the API, Keycloak, Metro) to the Mac's same-numbered one.

import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { mobileEnv } from "./mobile-env.mjs";
import { ANDROID_API, androidSdk, apiMatches, diagnose, gather, report } from "./mobile-doctor.mjs";
import { ROOT, portOf, stackEnv } from "./stack-ports.mjs";

const REVERSED = ["BACKEND_PORT", "KEYCLOAK_PORT", "METRO_PORT"];

export const reverseCalls = (env) =>
  REVERSED.map((name) => `tcp:${portOf(env, name)}`).map((port) => ["reverse", port, port]);

export const parseEmulators = (output) =>
  output.split("\n").flatMap((line) => {
    const match = line.match(/^(emulator-\d+)\s+device\s*$/);
    return match ? [match[1]] : [];
  });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const bootCompleted = (adb, serial) => {
  try {
    return execFileSync(adb, ["-s", serial, "shell", "getprop", "sys.boot_completed"], { encoding: "utf8" }).trim() === "1";
  } catch {
    return false;
  }
};

const bootEmulator = async (sdk, adb, avds) => {
  const emulator = resolve(sdk, "emulator/emulator");
  const name = process.env.AVD ?? avds.find((avd) => apiMatches(avd.target, ANDROID_API)).name;
  console.log(`no emulator is running; starting ${name}`);
  spawn(emulator, ["-avd", name], { detached: true, stdio: "ignore" }).unref();
  for (let waited = 0; waited < 180_000; waited += 2000) {
    await sleep(2000);
    const [serial] = parseEmulators(execFileSync(adb, ["devices"], { encoding: "utf8" }));
    if (serial && bootCompleted(adb, serial)) return [serial];
  }
  throw new Error(`${name} did not finish booting within 3 minutes`);
};

// Every running emulator gets the forwards, so the one `expo run:android`
// installs on has them whichever it picks.
const androidTarget = async (env, avds) => {
  const sdk = androidSdk(env);
  const adb = resolve(sdk, "platform-tools/adb");
  const running = parseEmulators(execFileSync(adb, ["devices"], { encoding: "utf8" }));
  const serials = running.length > 0 ? running : await bootEmulator(sdk, adb, avds);
  for (const serial of serials) {
    for (const call of reverseCalls(env)) execFileSync(adb, ["-s", serial, ...call], { stdio: "inherit" });
  }
  return sdk;
};

const run = async (platform, args) => {
  const stack = stackEnv();
  const facts = gather();
  const findings = diagnose(facts, platform);
  if (!report(findings.filter((finding) => !finding.ok))) {
    throw new Error(`the ${platform} toolchain is incomplete; \`make mobile-doctor\` lists all of it`);
  }
  const env = { ...process.env, ...mobileEnv(stack) };
  if (platform === "ios") {
    // CocoaPods fails on a non-UTF-8 locale without naming it.
    Object.assign(env, { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" });
  } else {
    const jdk = facts.jdks.find((candidate) => candidate.major === facts.pins.jdk);
    Object.assign(env, { ANDROID_HOME: await androidTarget(stack, facts.android.avds), JAVA_HOME: jdk.home });
  }
  const child = spawn("npm", ["run", platform, "--workspace", "mobile", "--", ...args], { cwd: ROOT, env, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [platform, ...args] = process.argv.slice(2);
  if (platform !== "ios" && platform !== "android") {
    console.error("usage: mobile-native.mjs ios|android [expo run flags]");
    process.exit(2);
  }
  run(platform, args).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
