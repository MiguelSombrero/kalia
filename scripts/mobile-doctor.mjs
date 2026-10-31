#!/usr/bin/env node
// Checks the Mac for the native toolchain the mobile app builds with and names
// each tool that is missing or the wrong version (`make mobile-doctor`).
//   node scripts/mobile-doctor.mjs [ios|android]
// The versions come from the manifests that own them: .node-version,
// .xcode-version and mobile/.java-version. The Android API level is the one
// Expo SDK's generated project compiles against, pinned here because no
// manifest of ours holds it. Exits 1 when any check fails.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT, stackEnv } from "./stack-ports.mjs";

export const ANDROID_API = 37;

export const androidSdk = (env = process.env) =>
  env.ANDROID_HOME || env.ANDROID_SDK_ROOT || resolve(homedir(), "Library/Android/sdk");

export const androidAvdHome = (env = process.env) => env.ANDROID_AVD_HOME || resolve(homedir(), ".android/avd");

// `java_home -V` prints each JDK as "<version> (<arch>) "<vendor>" - "<name>" <home>".
export const parseJdks = (output) =>
  output.split("\n").flatMap((line) => {
    const match = line.match(/^\s+(?:1\.)?(\d+)[\d._]*\s.*?(\/\S*)\s*$/);
    return match ? [{ major: match[1], home: match[2] }] : [];
  });

const versionParts = (version) => version.split(".").map(Number);

const ok = (tool, message) => ({ tool, ok: true, message });
const fail = (tool, message) => ({ tool, ok: false, message });

export const apiMatches = (name, api) => new RegExp(`^android-${api}(\\.\\d+)?$`).test(name);

const iosFindings = ({ pins, xcode, iphoneSimulators, pod }) => {
  const tool = `Xcode ${pins.xcode}`;
  const [wantMajor, wantMinor = 0] = versionParts(pins.xcode);
  const [haveMajor, haveMinor = 0] = xcode.version ? versionParts(xcode.version) : [];
  const xcodeOk = xcode.version && haveMajor === wantMajor && haveMinor >= wantMinor;
  return [
    xcodeOk
      ? ok(tool, `Xcode ${xcode.version}`)
      : fail(
          tool,
          xcode.version
            ? `found Xcode ${xcode.version}; install ${pins.xcode} or a later ${wantMajor}.x from the App Store or developer.apple.com`
            : "not installed; install Xcode from the App Store",
        ),
    !xcode.version || xcode.developerDir?.includes(".app/Contents/Developer")
      ? ok("Xcode command-line tools", xcode.developerDir || "n/a")
      : fail("Xcode command-line tools", "do not point at Xcode; run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`"),
    iphoneSimulators > 0
      ? ok("iOS Simulator", `${iphoneSimulators} iPhone simulators`)
      : fail("iOS Simulator", "no iPhone simulator; install an iOS runtime in Xcode > Settings > Components"),
    pod ? ok("CocoaPods", "installed") : fail("CocoaPods", "not installed; `brew install cocoapods`"),
  ];
};

const androidFindings = ({ pins, jdks, android }) => {
  const jdkTool = `JDK ${pins.jdk}`;
  const jdk = jdks.find((candidate) => candidate.major === pins.jdk);
  const findings = [
    jdk
      ? ok(jdkTool, jdk.home)
      : fail(
          jdkTool,
          `not installed (found: ${jdks.map((candidate) => candidate.major).join(", ") || "none"}); \`brew install --cask zulu@${pins.jdk}\``,
        ),
  ];
  if (!android.hasSdk) {
    return [...findings, fail("Android SDK", "not found; install Android Studio, open it once, or set ANDROID_HOME")];
  }
  const platform = android.platforms.some((name) => apiMatches(name, ANDROID_API));
  return [
    ...findings,
    ok("Android SDK", "found"),
    android.adb ? ok("adb", "installed") : fail("adb", "missing; install Android SDK Platform-Tools in Android Studio"),
    android.emulator ? ok("Android emulator", "installed") : fail("Android emulator", "missing; install the Android Emulator in Android Studio's SDK Tools"),
    platform
      ? ok(`Android ${ANDROID_API} platform`, "installed")
      : fail(`Android ${ANDROID_API} platform`, `missing; install SDK Platform ${ANDROID_API} in Android Studio`),
    android.buildTools.some((name) => name.startsWith(`${ANDROID_API}.`))
      ? ok("Android build-tools", "installed")
      : fail("Android build-tools", `no ${ANDROID_API}.x; install Android SDK Build-Tools ${ANDROID_API} in Android Studio`),
    android.avds.some((avd) => apiMatches(avd.target, ANDROID_API))
      ? ok(`Android ${ANDROID_API} emulator image`, "an emulator exists")
      : fail(
          `Android ${ANDROID_API} emulator image`,
          `no emulator on API ${ANDROID_API}; create a Pixel in Android Studio's Device Manager with a Google APIs arm64 API ${ANDROID_API} image`,
        ),
  ];
};

const commonFindings = ({ pins, node, stack }) => [
  node.split(".")[0] === pins.node ? ok("Node", node) : fail("Node", `found ${node}, .node-version pins ${pins.node}`),
  stack.isWorktree && !stack.metroPort
    ? fail("METRO_PORT", "this worktree's .env has none; run `make stack-env`")
    : ok("METRO_PORT", stack.metroPort ? "set in .env" : "default"),
];

export const diagnose = (facts, platform) => [
  ...commonFindings(facts),
  ...(platform === "android" ? [] : iosFindings(facts)),
  ...(platform === "ios" ? [] : androidFindings(facts)),
];

const probe = (command, args, options) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
  } catch (error) {
    return error.stdout?.toString() ?? "";
  }
};

// `java_home -V` lists the JDKs on stderr.
const listJdks = () => {
  const { stdout, stderr } = spawnSync("/usr/libexec/java_home", ["-V"], { encoding: "utf8" });
  return parseJdks(`${stdout}\n${stderr}`);
};

const pin = (path) => readFileSync(resolve(ROOT, path), "utf8").trim();

const listDir = (path) => {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
};

const avdTarget = (avdHome, name) => {
  try {
    return (readFileSync(resolve(avdHome, `${name}.ini`), "utf8").match(/^target=(.*)$/m) ?? [])[1] ?? "";
  } catch {
    return "";
  }
};

export const gather = (env = process.env) => {
  const sdk = androidSdk(env);
  const avdHome = androidAvdHome(env);
  const emulator = resolve(sdk, "emulator/emulator");
  const avds = existsSync(emulator)
    ? probe(emulator, ["-list-avds"]).split("\n").filter(Boolean).map((name) => ({
        name,
        target: avdTarget(avdHome, name),
      }))
    : [];
  const developerDir = probe("xcode-select", ["-p"]).trim();
  const xcodeVersion = probe("xcodebuild", ["-version"]).match(/^Xcode (\S+)/m);
  const commonDir = probe("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT }).trim();
  const gitDir = probe("git", ["rev-parse", "--absolute-git-dir"], { cwd: ROOT }).trim();
  return {
    pins: { xcode: pin(".xcode-version"), jdk: pin("mobile/.java-version"), node: pin(".node-version") },
    node: process.versions.node,
    xcode: { version: xcodeVersion?.[1] ?? null, developerDir: developerDir || null },
    iphoneSimulators: probe("xcrun", ["simctl", "list", "devices", "available"]).split("\n").filter((line) => /^\s+iPhone /.test(line)).length,
    pod: probe("pod", ["--version"], { env: { ...env, LANG: "en_US.UTF-8" } }).trim() !== "",
    jdks: listJdks(),
    android: {
      sdk,
      hasSdk: existsSync(sdk),
      adb: existsSync(resolve(sdk, "platform-tools/adb")),
      emulator: existsSync(emulator),
      platforms: listDir(resolve(sdk, "platforms")),
      buildTools: listDir(resolve(sdk, "build-tools")),
      avds,
    },
    stack: { isWorktree: gitDir !== commonDir, metroPort: stackEnv(env).METRO_PORT },
  };
};

export const report = (findings) => {
  for (const finding of findings) console.log(`${finding.ok ? "ok  " : "FAIL"} ${finding.tool}: ${finding.message}`);
  return findings.every((finding) => finding.ok);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const platform = process.argv[2];
  if (platform && platform !== "ios" && platform !== "android") {
    console.error("usage: mobile-doctor.mjs [ios|android]");
    process.exit(2);
  }
  process.exit(report(diagnose(gather(), platform)) ? 0 : 1);
}
