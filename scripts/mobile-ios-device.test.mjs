// Self-test for mobile-ios-device.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";

import { LAUNCH_REFUSED, REFUSALS, appPath, chooseDevice, installArgs, launchArgs, physicalPhones, xcodebuildArgs } from "./mobile-ios-device.mjs";

const UDID = "00000000-FAKEFAKEFAKEFAKE";

const phone = ({ connected = true, developerMode = true, udid = UDID } = {}) => ({
  properties: {
    hardware: { reality: "physical", deviceType: "iPhone", udid },
    connection: { state: connected ? "connected" : "disconnected" },
    state: { developerModeStatus: developerMode ? { enabled: { mode: 1 } } : "disabled" },
  },
});

const simulator = () => ({
  properties: { hardware: { reality: "simulated", deviceType: "iPhone", udid: "SIM" }, connection: { state: "connected" } },
});

const listing = (...devices) => ({ result: { devices } });

test("a physical iPhone that is connected with Developer Mode on is the target, and a simulator never is", () => {
  assert.deepEqual(chooseDevice(listing(simulator(), phone(), simulator())), { udid: UDID });
});

test("only simulators, or nothing, is refused with how to get the phone detected", () => {
  for (const devices of [[], [simulator()]]) {
    assert.equal(chooseDevice(listing(...devices)).refusal, REFUSALS.none);
  }
  assert.match(REFUSALS.none, /cable/);
  assert.match(REFUSALS.none, /Trust/);
  assert.match(REFUSALS.none, /Devices and Simulators/);
});

test("a phone the Mac knows but cannot reach is refused as disconnected", () => {
  assert.equal(chooseDevice(listing(phone({ connected: false }))).refusal, REFUSALS.disconnected);
});

test("two connected iPhones are refused rather than guessed between", () => {
  assert.equal(chooseDevice(listing(phone({ udid: "A" }), phone({ udid: "B" }))).refusal, REFUSALS.several);
});

test("Developer Mode off is refused, naming where it is switched on", () => {
  const { refusal } = chooseDevice(listing(phone({ developerMode: false })));
  assert.equal(refusal, REFUSALS.developerMode);
  assert.match(refusal, /Privacy & Security/);
});

test("the deprecated field groups of devicectl's JSON still select a phone", () => {
  const old = {
    hardwareProperties: { reality: "physical", deviceType: "iPhone", udid: UDID },
    connectionProperties: { tunnelState: "connected" },
    deviceProperties: { developerModeStatus: "enabled" },
  };
  assert.deepEqual(physicalPhones(listing(old)), [{ udid: UDID, connected: true, developerMode: true }]);
});

test("the build asks xcodebuild to create the profile, for the device and team it was given", () => {
  const args = xcodebuildArgs({ udid: UDID, teamId: "AB12CD34EF" });
  assert.ok(args.includes("-allowProvisioningUpdates"));
  assert.ok(args.includes("-allowProvisioningDeviceRegistration"));
  assert.ok(args.includes("DEVELOPMENT_TEAM=AB12CD34EF"));
  assert.equal(args[args.indexOf("-destination") + 1], `id=${UDID}`);
  assert.equal(args.at(-1), "build");
});

test("install and launch address the same device, and the app is the one the build wrote", () => {
  assert.deepEqual(installArgs(UDID).slice(0, 6), ["devicectl", "device", "install", "app", "--device", UDID]);
  assert.equal(installArgs(UDID).at(-1), appPath());
  assert.match(appPath(), /Debug-iphoneos\/Kalia\.app$/);
  assert.deepEqual(launchArgs(UDID), ["devicectl", "device", "process", "launch", "--device", UDID, "fi.kalia.app"]);
});

test("a refused first launch is reported as the expected trust step, not a failure", () => {
  assert.match(LAUNCH_REFUSED, /installed/i);
  assert.match(LAUNCH_REFUSED, /expected/);
  assert.match(LAUNCH_REFUSED, /Trust/);
  assert.doesNotMatch(LAUNCH_REFUSED, /fail|error/i);
});
