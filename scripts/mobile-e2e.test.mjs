#!/usr/bin/env node
// Self-test for mobile-e2e.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import {
  InfrastructureError,
  avdPath,
  MAESTRO_VERSION,
  maestroBinary,
  parseArgs,
  pickSimulators,
  probeEmulator,
  retryInfrastructure,
  verdict,
  waitHealthy,
} from "./mobile-e2e.mjs";

test("no arguments run every platform", () => {
  assert.deepEqual(parseArgs([]), { command: "run", platform: "all", abi: undefined, headless: false });
});

test("a command, a platform and an ABI are read from the arguments", () => {
  assert.deepEqual(parseArgs(["build", "--platform", "android", "--abi", "x86_64"]), {
    command: "build",
    platform: "android",
    abi: "x86_64",
    headless: false,
  });
});

test("--headless and the prepare-emulator command are read from the arguments", () => {
  assert.equal(parseArgs(["test", "--platform", "android", "--headless"]).headless, true);
  assert.equal(parseArgs(["prepare-emulator"]).command, "prepare-emulator");
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

// A fake adb that answers each question from a table, as a device would.
const device = ({ state = "device", booted = "1", packages = "package:/system/framework/framework-res.apk" } = {}) => (args) => {
  const key = args.join(" ");
  if (key === "wait-for-device") return "";
  if (key === "get-state") {
    if (state === null) throw new Error("device 'emulator-5554' not found");
    return state;
  }
  if (key === "shell getprop sys.boot_completed") return booted;
  if (key === "shell pm path android") {
    if (packages === null) throw new Error("cmd: Can't find service: package");
    return packages;
  }
  throw new Error(`unexpected adb ${key}`);
};

test("a device that is attached, booted and answering is healthy", () => {
  assert.deepEqual(probeEmulator(device()), { healthy: true });
});

test("a device adb lists as offline is not healthy, and the package manager is not asked", () => {
  const asked = [];
  const offline = (args) => {
    asked.push(args.join(" "));
    return device({ state: "offline" })(args);
  };
  const result = probeEmulator(offline);
  assert.equal(result.healthy, false);
  assert.match(result.problem, /offline/);
  assert.ok(!asked.includes("shell pm path android"));
});

test("a device adb cannot find is not healthy", () => {
  assert.match(probeEmulator(device({ state: null })).problem, /unreachable/);
});

test("a device that has not finished booting is not healthy", () => {
  assert.match(probeEmulator(device({ booted: "" })).problem, /sys\.boot_completed/);
});

test("a device whose package manager does not answer is not healthy, though it says it booted", () => {
  assert.match(probeEmulator(device({ packages: null })).problem, /package manager/);
});

const clock = () => {
  let time = 0;
  return { now: () => time, sleeper: async (ms) => void (time += ms) };
};

test("healthy has to hold for the whole settle window, so one good probe between drops is not enough", async () => {
  const answers = [true, true, false, true, true, true];
  let probes = 0;
  await waitHealthy(() => (answers[probes++] ? { healthy: true } : { healthy: false, problem: "adb lists the device as offline" }), {
    timeoutMs: 60_000,
    settle: 3,
    intervalMs: 1000,
    ...clock(),
  });
  assert.equal(probes, 6);
});

test("a device that never becomes healthy fails the wait, naming what was last wrong", async () => {
  await assert.rejects(
    waitHealthy(() => ({ healthy: false, problem: "the package manager does not answer" }), { timeoutMs: 10_000, settle: 3, intervalMs: 1000, ...clock() }),
    /not healthy within 10 s: the package manager does not answer/,
  );
});

test("an emulator that is unhealthy once is stopped and booted again, and the second one is used", async () => {
  const log = [];
  const result = await retryInfrastructure({
    what: "booting the emulator",
    run: async (attempt) => {
      log.push(`boot ${attempt}`);
      if (attempt === 1) throw new Error("adb lists the device as offline");
      return "emulator-5554";
    },
    cleanup: async (attempt) => void log.push(`stop ${attempt}`),
    log: (line) => log.push(line),
  });
  assert.equal(result, "emulator-5554");
  assert.deepEqual(log.filter((line) => !line.startsWith("::")), ["boot 1", "stop 1", "boot 2"]);
  assert.match(log.find((line) => line.startsWith("::warning::")), /attempt 1\/2.*offline/);
});

test("an emulator that is unhealthy twice fails the run as infrastructure, after exactly two boots", async () => {
  let boots = 0;
  let stops = 0;
  const failing = retryInfrastructure({
    what: "booting the emulator",
    run: async () => {
      boots += 1;
      throw new Error("adb lists the device as offline, not attached");
    },
    cleanup: async () => void (stops += 1),
    log: () => {},
  });
  await assert.rejects(failing, (error) => {
    assert.ok(error instanceof InfrastructureError);
    assert.match(error.message, /Infrastructure failure, not the app/);
    assert.match(error.message, /failed 2 times, so the flow did not run/);
    assert.match(error.message, /attempt 1: .*offline/);
    assert.match(error.message, /attempt 2: .*offline/);
    return true;
  });
  assert.equal(boots, 2);
  assert.equal(stops, 2);
});

test("the path of a virtual device is read from avdmanager's own listing, whichever directory it chose", () => {
  const listing = `Available Android Virtual Devices:
    Name: kalia-e2e-old
    Path: /somewhere/kalia-e2e-old.avd
  Target: Google APIs
---------
    Name: kalia-e2e
    Path: /home/runner/.config/.android/avd/kalia-e2e.avd
  Target: Google APIs
`;
  assert.equal(avdPath(listing, "kalia-e2e"), "/home/runner/.config/.android/avd/kalia-e2e.avd");
  assert.equal(avdPath(listing, "absent"), undefined);
  assert.equal(avdPath("Available Android Virtual Devices:\n", "kalia-e2e"), undefined);
});
