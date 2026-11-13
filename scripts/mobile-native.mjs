#!/usr/bin/env node
// Builds the app and runs it on a simulator or emulator against this checkout's
// stack (`make mobile-ios`, `make mobile-android`), or installs it on the
// connected iPhone (`make mobile-ios-device`). A development build has the dev
// menu and Metro; with --release (the `-release` targets) the build has its
// JavaScript inside and no dev menu:
//   node scripts/mobile-native.mjs ios|ios-device|android [--release] [expo run flags]
// Every port comes from the worktree's .env through stack-ports.mjs. The iOS
// Simulator shares the Mac's network, so the app dials localhost directly; the
// Android emulator has a network of its own, so `adb reverse` forwards each
// port the app dials (the API, Keycloak, Metro) to the Mac's same-numbered one.

import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PLATFORMS, buildPlan, runSteps } from "./mobile-build.mjs";
import {
  ANDROID_API,
  TEAM_ID_VARIABLE,
  androidSdk,
  apiMatches,
  diagnose,
  gather,
  report,
  teamFinding,
} from "./mobile-doctor.mjs";
import { choosePhone, installOnDevice, startKeepAlive } from "./mobile-ios-device.mjs";
import { up as metroUp } from "./mobile-metro.mjs";
import { ROOT, portOf, stackEnv } from "./stack-ports.mjs";

const REVERSED = ["BACKEND_PORT", "KEYCLOAK_PORT", "METRO_PORT"];

// A release build has its JavaScript inside and never dials Metro.
export const reverseCalls = (env, variant = "development") =>
  REVERSED.filter((name) => variant === "development" || name !== "METRO_PORT").map((name) => `tcp:${portOf(env, name)}`).map((port) => ["reverse", port, port]);

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
const androidTarget = async (env, avds, variant) => {
  const sdk = androidSdk(env);
  const adb = resolve(sdk, "platform-tools/adb");
  const running = parseEmulators(execFileSync(adb, ["devices"], { encoding: "utf8" }));
  const serials = running.length > 0 ? running : await bootEmulator(sdk, adb, avds);
  for (const serial of serials) {
    for (const call of reverseCalls(env, variant)) execFileSync(adb, ["-s", serial, ...call], { stdio: "inherit" });
  }
  return sdk;
};

const run = async (platform, variant, args) => {
  const stack = stackEnv();
  const plan = buildPlan(stack, { platform, variant, args });
  if (plan.problem) throw new Error(plan.problem);
  const team = teamFinding(stack[TEAM_ID_VARIABLE], true);
  if (platform === "ios-device" && !team.ok) {
    report([team]);
    throw new Error("an iPhone build is signed with your Apple Team ID, which the root .env holds");
  }
  const facts = gather();
  const findings = diagnose(facts, platform);
  if (!report(findings.filter((finding) => !finding.ok))) {
    throw new Error(`the ${platform} toolchain is incomplete; \`make mobile-doctor\` lists all of it`);
  }
  const env = { ...process.env, ...plan.env };
  if (platform === "ios-device") env[TEAM_ID_VARIABLE] = stack[TEAM_ID_VARIABLE];
  if (platform !== "android") {
    // CocoaPods fails on a non-UTF-8 locale without naming it.
    Object.assign(env, { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" });
  }
  // The phone is checked before the minute-long prebuild, not after it, and
  // kept awake until the build is installed or has failed.
  const udid = platform === "ios-device" ? choosePhone() : undefined;
  const stopKeepAlive = udid ? startKeepAlive(udid) : () => {};
  try {
    const build = plan.steps.at(-1);
    runSteps(plan.steps.slice(0, -1), env);
    if (platform === "android") {
      const jdk = facts.jdks.find((candidate) => candidate.major === facts.pins.jdk);
      Object.assign(env, { ANDROID_HOME: await androidTarget(stack, facts.android.avds, variant), JAVA_HOME: jdk.home });
    }
    if (udid) {
      installOnDevice({ env, teamId: stack[TEAM_ID_VARIABLE], udid, configuration: build.configuration });
      return;
    }
    // `expo run` stays attached to the Metro it starts, so a call that waits
    // for it never returns. With Metro already up for this project on this
    // port, it installs, launches and exits.
    if (variant === "development") {
      const metro = await metroUp({ stack });
      if (!metro.ok) throw new Error(metro.message);
      console.log(metro.message);
    }
    const child = spawn(build.command, build.args, { cwd: ROOT, env, stdio: "inherit" });
    child.on("exit", (code) => process.exit(code ?? 1));
  } finally {
    stopKeepAlive();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [platform, ...rest] = process.argv.slice(2);
  const release = rest[0] === "--release";
  if (!PLATFORMS.includes(platform)) {
    console.error("usage: mobile-native.mjs ios|ios-device|android [--release] [expo run flags]");
    process.exit(2);
  }
  run(platform, release ? "release" : "development", release ? rest.slice(1) : rest).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
