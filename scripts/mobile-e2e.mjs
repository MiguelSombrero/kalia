#!/usr/bin/env node
// Builds the mobile app with its JavaScript inside, installs it on a
// simulator or emulator and runs the Maestro flows in mobile/.maestro/ against
// the running stack (ADR-0096).
//
//   node scripts/mobile-e2e.mjs [run] [--platform ios|android|all]
//   node scripts/mobile-e2e.mjs build --platform android [--abi x86_64]
//   node scripts/mobile-e2e.mjs test --platform android [--headless]
//   node scripts/mobile-e2e.mjs install-maestro
//   node scripts/mobile-e2e.mjs prepare-emulator
//
// With no platform it runs every one the host can and says which it skipped
// and why; it fails when none ran. `build` and `test` are the two halves of
// `run`, which CI runs apart so the emulator boots after the build.
// `prepare-emulator` installs the SDK pieces and creates the virtual device on
// a host that has none (CI); `--headless` boots it without a window.

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, openSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
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
const SYSTEM_IMAGE = "system-images;android-36;google_apis;x86_64";
const CI_AVD = "kalia-e2e";
// The runner has four vCPUs. In a probe of cold boots followed by a Maestro
// launchApp, two emulator cores failed once in 12 at a load average of 19 and
// four cores in none of 12, with flows that ran a third faster.
const CI_CORES = 4;

export const parseArgs = (argv) => {
  const commands = ["run", "build", "test", "install-maestro", "prepare-emulator"];
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
  return { command, platform, abi: value("--abi"), headless: rest.includes("--headless") };
};

// A skipped platform is reported with its reason, but nothing running at all
// is a failure, so a host without a simulator or an emulator cannot pass.
export const verdict = (results) => {
  const lines = results.map(({ platform, status, reason }) =>
    status === "passed" ? `  ${platform}: flow ran and passed` : `  ${platform}: ${status}${reason ? ` — ${reason}` : ""}`,
  );
  const failed = results.some((result) => result.status === "failed");
  const passed = results.some((result) => ["passed", "built"].includes(result.status));
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

const emulatorSerials = (adb) =>
  capture(adb, ["devices"])
    .split("\n")
    .map((line) => line.split("\t")[0])
    .filter((serial) => serial.startsWith("emulator-"));

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// What `launchApp` needs of a device, and what a runner's emulator has been
// seen to lack: adb lists it attached, Android says the boot finished, and the
// package manager answers. `ask` runs adb against the one device and throws
// when adb or the device does not answer.
export const probeEmulator = (ask) => {
  const answer = (args) => {
    try {
      return ask(args);
    } catch {
      return undefined;
    }
  };
  answer(["wait-for-device"]);
  const state = answer(["get-state"]);
  if (state !== "device") return { healthy: false, problem: `adb lists the device as ${state ?? "unreachable"}, not attached` };
  if (answer(["shell", "getprop", "sys.boot_completed"]) !== "1") return { healthy: false, problem: "sys.boot_completed is not set" };
  if (!answer(["shell", "pm", "path", "android"])?.startsWith("package:")) return { healthy: false, problem: "the package manager does not answer" };
  return { healthy: true };
};

// Healthy once is not enough: a runner's emulator has gone offline seconds
// after it first looked healthy, so it has to stay healthy for `settle`
// probes in a row.
export const waitHealthy = async (probe, { timeoutMs, settle, intervalMs, sleeper = sleep, now = Date.now }) => {
  const deadline = now() + timeoutMs;
  let streak = 0;
  let problem = "it was never probed";
  while (now() < deadline) {
    const result = probe();
    if (result.healthy) {
      streak += 1;
      if (streak >= settle) return;
    } else {
      streak = 0;
      problem = result.problem;
    }
    await sleeper(intervalMs);
  }
  throw new Error(`the emulator was not healthy within ${timeoutMs / 1000} s: ${problem}`);
};

// Alive is not quiet: a runner's emulator has dropped its adb connection a
// second into the flow while Play services and Settings were still indexing,
// with a one-minute load average of several times its core count. Waiting is
// bounded, and a device that stays busy is logged and used rather than failed.
export const waitQuiet = async (read, { limit, timeoutMs, intervalMs, sleeper = sleep, now = Date.now, log = console.log }) => {
  const started = now();
  let load = Number.NaN;
  while (now() - started < timeoutMs) {
    load = read();
    if (load < limit) {
      log(`The emulator is quiet: load average ${load} after ${Math.round((now() - started) / 1000)} s`);
      return { quiet: true, load };
    }
    await sleeper(intervalMs);
  }
  log(`::warning::the emulator is still busy (load average ${load}) after ${timeoutMs / 1000} s; going on`);
  return { quiet: false, load };
};

export class InfrastructureError extends Error {}

// The emulator and the SDK around it are the runner's, not the app's: a step
// that fails on them is tried again from a clean state, and when every attempt
// has failed the run says so, rather than looking like a failed flow. The flow
// itself is never retried.
export const retryInfrastructure = async ({ what, attempts = 2, run: attempt, cleanup, log = console.log }) => {
  const failures = [];
  for (let number = 1; number <= attempts; number += 1) {
    try {
      return await attempt(number);
    } catch (error) {
      failures.push(`attempt ${number}: ${error.message}`);
      log(`::warning::${what} failed (attempt ${number}/${attempts}): ${error.message}`);
      await cleanup(number);
    }
  }
  throw new InfrastructureError(`Infrastructure failure, not the app: ${what} failed ${attempts} times, so the flow did not run.\n  ${failures.join("\n  ")}`);
};

const BOOT_WAIT = { timeoutMs: 300_000, settle: 5, intervalMs: 5000 };
const INSTALL_WAIT = { timeoutMs: 120_000, settle: 3, intervalMs: 5000 };
const QUIET_AFTER_BOOT = { limit: CI_CORES / 2, timeoutMs: 180_000, intervalMs: 5000 };
const QUIET_AFTER_INSTALL = { limit: CI_CORES / 2, timeoutMs: 90_000, intervalMs: 5000 };

const deviceProbe = (adb, serial) => () =>
  probeEmulator((args) => capture(adb, ["-s", serial, ...args], { timeout: 15_000, stdio: ["ignore", "pipe", "ignore"] }));

const deviceLoad = (adb, serial) => () => {
  try {
    return Number.parseFloat(capture(adb, ["-s", serial, "shell", "cat", "/proc/loadavg"], { timeout: 15_000, stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return Number.NaN;
  }
};

let launched;

const launchEmulator = async (adb, emulator, avd, headless, attempt) => {
  run(adb, ["start-server"]);
  const before = emulatorSerials(adb);
  const options = headless
    ? ["-no-window", "-gpu", "swiftshader_indirect", "-no-snapshot", "-noaudio", "-no-boot-anim"]
    : ["-no-snapshot-save", "-no-boot-anim", "-no-audio"];
  mkdirSync(OUTPUT, { recursive: true });
  const log = openSync(join(OUTPUT, `emulator-${attempt}.log`), "w");
  console.log(`Starting the emulator ${avd} (attempt ${attempt})`);
  launched = spawn(emulator, ["-avd", avd, ...options], { detached: true, stdio: ["ignore", log, log], env: avdEnv() });
  launched.unref();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const serial = emulatorSerials(adb).find((each) => !before.includes(each));
    if (serial) return serial;
  }
  throw new Error(`the emulator ${avd} never appeared in adb`);
};

const stopEmulator = async (adb, serial) => {
  if (serial) spawnSync(adb, ["-s", serial, "emu", "kill"], { stdio: "ignore" });
  if (launched?.pid) {
    try {
      process.kill(-launched.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
  const deadline = Date.now() + 30_000;
  while (serial && Date.now() < deadline && emulatorSerials(adb).includes(serial)) await sleep(1000);
};

const disableAnimations = (adb, serial) =>
  ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"].forEach((key) =>
    run(adb, ["-s", serial, "shell", "settings", "put", "global", key, "0"]),
  );

const sdkRoot = () => [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].find(Boolean);

// sdkmanager redraws a progress bar on every percent, which buries the lines
// that matter in a CI log.
const quiet = (text) =>
  text
    .split(/[\r\n]+/)
    .filter((line) => line.trim() && !/^\[[= ]*\]/.test(line) && !line.startsWith("Warning: This version only understands"))
    .join("\n");

const sdk = (tool, args, input) => {
  const result = spawnSync(tool, args, { input, encoding: "utf8", env: avdEnv(), maxBuffer: 64 * 1024 * 1024 });
  const shown = quiet(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  if (shown) console.log(shown);
  if (result.status !== 0) throw new Error(`${basename(tool)} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
  return result.stdout ?? "";
};

// avdmanager honours ANDROID_USER_HOME and ignores ANDROID_AVD_HOME, falling
// back to $XDG_CONFIG_HOME/.android when that is set, as it is on a runner; the
// emulator reads ANDROID_AVD_HOME and never looks under XDG. Left alone they
// disagree about where a virtual device is, so both are told.
const androidHome = () => process.env.ANDROID_USER_HOME ?? join(homedir(), ".android");
const avdHome = () => process.env.ANDROID_AVD_HOME ?? join(androidHome(), "avd");
const avdEnv = () => ({ ...process.env, ANDROID_USER_HOME: androidHome(), ANDROID_AVD_HOME: avdHome() });

// A virtual device for a host that has none. Each tool's output stays
// visible: avdmanager has crashed on a runner with `"hwMap" is null`, and its
// own output is the only clue to why.
const prepareEmulator = async () => {
  const sdkmanager = sdkTool("cmdline-tools/latest/bin", "sdkmanager");
  const avdmanager = sdkTool("cmdline-tools/latest/bin", "avdmanager");
  if (!sdkmanager || !avdmanager) throw new Error("sdkmanager and avdmanager are not installed (set ANDROID_HOME to an SDK with cmdline-tools)");
  await retryInfrastructure({
    what: "preparing the virtual device",
    run: (attempt) => {
      sdk(sdkmanager, ["--licenses"], "y\n".repeat(50));
      if (attempt > 1) sdk(sdkmanager, ["--uninstall", "emulator"]);
      sdk(sdkmanager, ["--install", "emulator", "platform-tools", SYSTEM_IMAGE]);
      sdk(avdmanager, ["create", "avd", "--force", "-n", CI_AVD, "--package", SYSTEM_IMAGE], "no\n");
      if (!existsSync(join(avdHome(), `${CI_AVD}.ini`))) throw new Error(`avdmanager exited 0 but created no ${CI_AVD} in ${avdHome()}`);
      appendFileSync(join(avdHome(), `${CI_AVD}.avd`, "config.ini"), `hw.cpu.ncore=${CI_CORES}\n`);
    },
    cleanup: () => {
      const root = sdkRoot();
      console.log(`emulator/lib/hardware-properties.ini present: ${root ? existsSync(join(root, "emulator", "lib", "hardware-properties.ini")) : "unknown, no ANDROID_HOME"}`);
      console.log(["ANDROID_AVD_HOME", "ANDROID_USER_HOME", "ANDROID_SDK_HOME", "HOME"].map((name) => `${name}=${process.env[name] ?? "(unset)"}`).join(" "));
    },
  });
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
    if (command === "build") return { platform: "ios", status: "built" };
    runMaestro("ios", udid);
    return { platform: "ios", status: "passed" };
  } catch (error) {
    return { platform: "ios", status: "failed", reason: error.message };
  }
};

const runAndroid = async (command, abi, headless) => {
  let release = () => {};
  let adb;
  try {
    if (command === "build") {
      buildAndroid(abi);
      return { platform: "android", status: "built" };
    }
    adb = sdkTool("platform-tools", "adb");
    if (!adb) return { platform: "android", status: "skipped", reason: "adb not found (install the Android SDK, or set ANDROID_HOME)" };
    // The install is the heaviest thing the device does before the flow, so
    // it is inside the attempt: a device that drops after it is booted again.
    let built = false;
    const settleWithApp = async (serial) => {
      if (command === "run" && !built) {
        built = true;
        buildAndroid(abi ?? capture(adb, ["-s", serial, "shell", "getprop", "ro.product.cpu.abi"]));
      }
      release = reverseStackPorts(adb, serial);
      run(adb, ["-s", serial, "install", "-r", APK]);
      await waitHealthy(deviceProbe(adb, serial), INSTALL_WAIT);
      await waitQuiet(deviceLoad(adb, serial), QUIET_AFTER_INSTALL);
    };
    let serial = emulatorSerials(adb)[0];
    if (serial) {
      await waitHealthy(deviceProbe(adb, serial), BOOT_WAIT);
      await waitQuiet(deviceLoad(adb, serial), QUIET_AFTER_BOOT);
      await settleWithApp(serial);
    } else {
      const emulator = sdkTool("emulator", "emulator");
      if (!emulator) return { platform: "android", status: "skipped", reason: "no emulator running and the SDK has no emulator" };
      const avd = process.env.KALIA_E2E_AVD ?? (headless ? CI_AVD : capture(emulator, ["-list-avds"]).split("\n")[0]);
      if (!avd) return { platform: "android", status: "skipped", reason: "no emulator running and no Android virtual device exists" };
      await retryInfrastructure({
        what: `booting the emulator ${avd} to a healthy state with the app installed`,
        run: async (attempt) => {
          serial = undefined;
          serial = await launchEmulator(adb, emulator, avd, headless, attempt);
          await waitHealthy(deviceProbe(adb, serial), BOOT_WAIT);
          await waitQuiet(deviceLoad(adb, serial), QUIET_AFTER_BOOT);
          if (headless) disableAnimations(adb, serial);
          await settleWithApp(serial);
        },
        cleanup: () => stopEmulator(adb, serial),
      });
    }
    runMaestro("android", serial);
    return { platform: "android", status: "passed" };
  } catch (error) {
    if (adb) spawnSync(adb, ["devices", "-l"], { stdio: "inherit" });
    return { platform: "android", status: "failed", reason: error.message };
  } finally {
    release();
  }
};

const main = async () => {
  const { command, platform, abi, headless } = parseArgs(process.argv.slice(2));
  if (command === "install-maestro") {
    console.log(await installMaestro());
    return;
  }
  if (command === "prepare-emulator") {
    await prepareEmulator();
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
    results.push(each === "ios" ? runIos(command) : await runAndroid(command, abi, headless));
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
