#!/usr/bin/env node
// Builds the mobile app with its JavaScript inside, installs it on a
// simulator or emulator and runs the Maestro flows in mobile/.maestro/ against
// the running stack (ADR-0096).
//
//   node scripts/mobile-e2e.mjs [run] [--platform ios|android|all]
//   node scripts/mobile-e2e.mjs build --platform android [--abi x86_64]
//   node scripts/mobile-e2e.mjs test --platform android
//   node scripts/mobile-e2e.mjs install-maestro
//
// With no platform it runs every one the host can and says which it skipped
// and why; it fails when none ran. `build` and `test` are the two halves of
// `run`, which CI runs apart so the emulator boots after the build.

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { mobileEnv } from "./mobile-env.mjs";
import { ROOT, originOf, stackEnv } from "./stack-ports.mjs";

export const MAESTRO_VERSION = "2.12.0";
export const MAESTRO_SHA256 = "a6044a84542f522f434c5dc3d609e60c7446d423f3ed1b2ae513f5c48663ec5e";
const MAESTRO_URL = `https://github.com/mobile-dev-inc/Maestro/releases/download/cli-${MAESTRO_VERSION}/maestro.zip`;

const MOBILE = resolve(ROOT, "mobile");
const FLOWS = resolve(MOBILE, ".maestro");
const OUTPUT = resolve(MOBILE, "maestro-output");
const APK = resolve(MOBILE, "android/app/build/outputs/apk/release/app-release.apk");
const PLATFORMS = ["ios", "android"];

export const parseArgs = (argv) => {
  const commands = ["run", "build", "test", "install-maestro"];
  const command = commands.includes(argv[0]) ? argv[0] : "run";
  const rest = commands.includes(argv[0]) ? argv.slice(1) : argv;
  const value = (flag) => {
    const at = rest.indexOf(flag);
    return at === -1 ? undefined : rest[at + 1];
  };
  const platform = value("--platform") ?? "all";
  if (platform !== "all" && !PLATFORMS.includes(platform)) {
    throw new Error(`--platform must be ios, android or all, not ${platform}`);
  }
  return { command, platform, abi: value("--abi") };
};

// A platform that was asked for by name and could not run is a failure; one
// that "all" found unavailable is a skip. Nothing running at all is a failure
// either way, so a host without a simulator or an emulator cannot pass.
export const verdict = (results) => {
  const lines = results.map(({ platform, status, reason }) =>
    status === "passed" ? `  ${platform}: flow ran and passed` : `  ${platform}: ${status}${reason ? ` — ${reason}` : ""}`,
  );
  const failed = results.some((result) => result.status === "failed");
  const passed = results.some((result) => result.status === "passed");
  if (!passed && !failed) lines.push("No platform ran the flow: start a simulator or an emulator, or install what is named above.");
  return { ok: passed && !failed, lines };
};

// Booted ones first; a name can be on several runtimes, and one of those may
// be listed as available while its runtime is not installed.
export const pickSimulators = (listing, nameOrUdid) =>
  Object.values(listing.devices)
    .flat()
    .filter((device) => device.isAvailable && (device.name === nameOrUdid || device.udid === nameOrUdid))
    .sort((a, b) => Number(b.state === "Booted") - Number(a.state === "Booted"));

export const cacheDir = (home = homedir()) => join(home, ".cache", "kalia", "maestro", MAESTRO_VERSION);
export const maestroBinary = (home = homedir()) => join(cacheDir(home), "maestro", "bin", "maestro");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
};

const capture = (command, args, options = {}) => execFileSync(command, args, { encoding: "utf8", ...options }).trim();

const sha256 = async (path) => {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
};

export const installMaestro = async () => {
  const binary = maestroBinary();
  if (existsSync(binary)) return binary;
  const dir = cacheDir();
  mkdirSync(dir, { recursive: true });
  const archive = join(dir, "maestro.zip");
  console.log(`Downloading Maestro ${MAESTRO_VERSION}`);
  const response = await fetch(MAESTRO_URL);
  if (!response.ok || !response.body) throw new Error(`Maestro download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
  const actual = await sha256(archive);
  if (actual !== MAESTRO_SHA256) {
    rmSync(archive);
    throw new Error(`Maestro download is ${actual}, not the pinned ${MAESTRO_SHA256}`);
  }
  run("unzip", ["-q", "-o", archive, "-d", dir]);
  rmSync(archive);
  return binary;
};

const maestroEnv = {
  MAESTRO_CLI_NO_ANALYTICS: "1",
  MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
};

const stackReachable = async (apiOrigin) => {
  try {
    const response = await fetch(`${apiOrigin}/api/v1/beers?page=0&size=1`);
    return response.ok;
  } catch {
    return false;
  }
};

const appEnv = () => ({ ...process.env, ...mobileEnv(stackEnv()) });

const runMaestro = (platform, deviceId) => {
  const dir = join(OUTPUT, platform);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  run(
    maestroBinary(),
    ["--platform", platform, "--device", deviceId, "test", "--format", "junit", "--output", join(dir, "report.xml"), "--test-output-dir", dir, FLOWS],
    { cwd: MOBILE, env: { ...process.env, ...maestroEnv } },
  );
};

const ios = {
  candidates: () => {
    const name = process.env.KALIA_E2E_IOS_DEVICE ?? "iPhone 17";
    if (process.platform !== "darwin") return { reason: "iOS Simulator needs a Mac" };
    try {
      const found = pickSimulators(JSON.parse(capture("xcrun", ["simctl", "list", "devices", "available", "-j"])), name);
      return found.length > 0 ? { found } : { reason: `no simulator named ${name} (KALIA_E2E_IOS_DEVICE names another, or a UDID)` };
    } catch {
      return { reason: "Xcode's simctl is not available" };
    }
  },
  boot: (found) => {
    for (const { udid, state } of found) {
      if (state === "Booted") return udid;
      if (spawnSync("xcrun", ["simctl", "boot", udid], { stdio: "inherit" }).status === 0) {
        run("xcrun", ["simctl", "bootstatus", udid, "-b"], { stdio: ["ignore", "ignore", "inherit"] });
        return udid;
      }
    }
    throw new Error("no simulator of that name would boot");
  },
  // run:ios installs the app it builds, so build and install are one step.
  build: (udid) => {
    run("npx", ["expo", "run:ios", "--configuration", "Release", "--device", udid, "--no-bundler"], {
      cwd: MOBILE,
      env: { ...appEnv(), LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    });
  },
};

const sdkTool = (relative, name) => {
  const roots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, join(homedir(), "Library/Android/sdk"), join(homedir(), "Android/Sdk")];
  const found = roots.filter(Boolean).map((root) => join(root, relative, name)).find(existsSync);
  if (found) return found;
  return spawnSync(name, ["--version"], { stdio: "ignore" }).error ? undefined : name;
};

const runningEmulator = (adb) =>
  capture(adb, ["devices"])
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"))
    .find(([serial, state]) => serial.startsWith("emulator-") && state === "device")?.[0];

const bootEmulator = async (adb, emulator) => {
  const avd = process.env.KALIA_E2E_AVD ?? capture(emulator, ["-list-avds"]).split("\n")[0];
  if (!avd) return undefined;
  console.log(`Starting the emulator ${avd}`);
  spawn(emulator, ["-avd", avd, "-no-snapshot-save", "-no-boot-anim", "-no-audio"], { detached: true, stdio: "ignore" }).unref();
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 3000));
    const serial = runningEmulator(adb);
    if (serial && capture(adb, ["-s", serial, "shell", "getprop", "sys.boot_completed"]) === "1") return serial;
  }
  throw new Error(`The emulator ${avd} did not finish booting in four minutes`);
};

const jdk17 = () => {
  try {
    return process.platform === "darwin" ? capture("/usr/libexec/java_home", ["-v", "17"]) : process.env.JAVA_HOME;
  } catch {
    return process.env.JAVA_HOME;
  }
};

const buildAndroid = (abi) => {
  const env = { ...appEnv(), KALIA_E2E: "1", JAVA_HOME: jdk17() };
  run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"], { cwd: MOBILE, env });
  run("./gradlew", [":app:assembleRelease", ...(abi ? [`-PreactNativeArchitectures=${abi}`] : [])], { cwd: join(MOBILE, "android"), env });
};

// The emulator reaches the host's stack through `adb reverse`, so the app
// dials localhost there as it does on the iOS Simulator.
const reverseStackPorts = (adb, serial) => {
  const env = stackEnv();
  const ports = ["BACKEND_PORT", "KEYCLOAK_PORT"].map((name) => new URL(originOf(env, name)).port);
  ports.forEach((port) => run(adb, ["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`]));
  return () => ports.forEach((port) => spawnSync(adb, ["-s", serial, "reverse", "--remove", `tcp:${port}`], { stdio: "ignore" }));
};

const runIos = (command) => {
  const { found, reason } = ios.candidates();
  if (reason) return { platform: "ios", status: "skipped", reason };
  try {
    const udid = ios.boot(found);
    if (command !== "test") ios.build(udid);
    runMaestro("ios", udid);
    return { platform: "ios", status: "passed" };
  } catch (error) {
    return { platform: "ios", status: "failed", reason: error.message };
  }
};

const runAndroid = async (command, abi) => {
  let release = () => {};
  try {
    if (command === "build") {
      buildAndroid(abi);
      return { platform: "android", status: "passed" };
    }
    const adb = sdkTool("platform-tools", "adb");
    if (!adb) return { platform: "android", status: "skipped", reason: "adb not found (install the Android SDK, or set ANDROID_HOME)" };
    let serial = runningEmulator(adb);
    if (!serial) {
      const emulator = sdkTool("emulator", "emulator");
      if (!emulator) return { platform: "android", status: "skipped", reason: "no emulator running and the SDK has no emulator" };
      serial = await bootEmulator(adb, emulator);
      if (!serial) return { platform: "android", status: "skipped", reason: "no emulator running and no Android virtual device exists" };
    }
    if (command === "run") buildAndroid(abi ?? capture(adb, ["-s", serial, "shell", "getprop", "ro.product.cpu.abi"]));
    release = reverseStackPorts(adb, serial);
    run(adb, ["-s", serial, "install", "-r", APK]);
    runMaestro("android", serial);
    return { platform: "android", status: "passed" };
  } catch (error) {
    return { platform: "android", status: "failed", reason: error.message };
  } finally {
    release();
  }
};

const main = async () => {
  const { command, platform, abi } = parseArgs(process.argv.slice(2));
  if (command === "install-maestro") {
    console.log(await installMaestro());
    return;
  }
  if (command !== "build") {
    const api = originOf(stackEnv(), "BACKEND_PORT");
    if (!(await stackReachable(api))) throw new Error(`The stack is not answering at ${api} — bring it up first (make up).`);
    if (!existsSync(maestroBinary())) {
      throw new Error(`Maestro ${MAESTRO_VERSION} is not installed — run: node scripts/mobile-e2e.mjs install-maestro`);
    }
  }
  const results = [];
  for (const each of platform === "all" ? PLATFORMS : [platform]) {
    results.push(each === "ios" ? runIos(command) : await runAndroid(command, abi));
  }
  const { ok, lines } = verdict(results);
  console.log(`Mobile end-to-end flow (${command}):\n${lines.join("\n")}`);
  if (!ok) process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
