// Installs the build on the connected iPhone (`make mobile-ios-device` for the
// development build, `make mobile-ios-device-release` for the release one,
// through mobile-native.mjs). `expo run:ios --device` is not
// used: it passes -allowProvisioningUpdates to xcodebuild only while the Xcode
// project has no development team, and the team in app.config.js puts one
// there, so the provisioning profile would never be created or renewed. This
// builds with the flags itself, then installs and launches with devicectl.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { ROOT } from "./stack-ports.mjs";

export const BUNDLE_ID = "fi.kalia.app";
export const SCHEME = "Kalia";

const IOS_DIR = resolve(ROOT, "mobile/ios");
const DERIVED_DATA = resolve(IOS_DIR, "build");

// devicectl lists simulators beside real devices; only `reality: physical` is
// one. Its JSON moved these fields under `properties` and deprecated the old
// top-level groups, so both are read.
const developerModeOn = (status) => status === "enabled" || (typeof status === "object" && status !== null && "enabled" in status);

export const physicalPhones = (listing) =>
  (listing?.result?.devices ?? []).flatMap((device) => {
    const hardware = device.properties?.hardware ?? device.hardwareProperties ?? {};
    if (hardware.reality !== "physical" || hardware.deviceType !== "iPhone") return [];
    const connection = device.properties?.connection ?? {};
    return [
      {
        udid: hardware.udid,
        connected: connection.state === "connected" || device.connectionProperties?.tunnelState === "connected",
        developerMode: developerModeOn(device.properties?.state?.developerModeStatus ?? device.deviceProperties?.developerModeStatus),
      },
    ];
  });

export const REFUSALS = {
  none:
    "no iPhone is connected: plug it into the Mac with the cable, unlock it and tap Trust, then check that Xcode > Window > Devices and Simulators lists it as connected",
  several: "more than one iPhone is connected; unplug all but the one to install on",
  disconnected:
    "the iPhone is known to the Mac but not connected: unlock it, reconnect the cable and tap Trust, then check Xcode > Window > Devices and Simulators",
  developerMode: "Developer Mode is off on the iPhone: Settings > Privacy & Security > Developer Mode, switch it on and restart the phone",
};

export const chooseDevice = (listing) => {
  const phones = physicalPhones(listing);
  const connected = phones.filter((phone) => phone.connected);
  if (connected.length > 1) return { refusal: REFUSALS.several };
  if (connected.length === 0) return { refusal: phones.length > 0 ? REFUSALS.disconnected : REFUSALS.none };
  return connected[0].developerMode ? { udid: connected[0].udid } : { refusal: REFUSALS.developerMode };
};

export const xcodebuildArgs = ({ udid, teamId, configuration = "Debug" }) => [
  "-workspace",
  resolve(IOS_DIR, `${SCHEME}.xcworkspace`),
  "-scheme",
  SCHEME,
  "-configuration",
  configuration,
  "-destination",
  `id=${udid}`,
  "-derivedDataPath",
  DERIVED_DATA,
  `DEVELOPMENT_TEAM=${teamId}`,
  "-allowProvisioningUpdates",
  "-allowProvisioningDeviceRegistration",
  "build",
];

export const appPath = (configuration = "Debug") => resolve(DERIVED_DATA, `Build/Products/${configuration}-iphoneos`, `${SCHEME}.app`);

export const installArgs = (udid, configuration) => ["devicectl", "device", "install", "app", "--device", udid, appPath(configuration)];

export const LAUNCH_REFUSED =
  "Kalia is installed. The phone refused to launch it because it does not trust the developer yet, which is expected on the first install: on the iPhone, Settings > General > VPN & Device Management > the Apple ID under Developer App > Trust, then open Kalia from the home screen.";
export const launchArgs = (udid) => ["devicectl", "device", "process", "launch", "--device", udid, BUNDLE_ID];

export const listDevices = () => {
  const dir = mkdtempSync(join(tmpdir(), "kalia-devices-"));
  const out = join(dir, "devices.json");
  try {
    execFileSync("xcrun", ["devicectl", "list", "devices", "--json-output", out], { stdio: "ignore" });
    return JSON.parse(readFileSync(out, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const step = (command, args, env) => {
  const { status } = spawnSync(command, args, { cwd: ROOT, env, stdio: "inherit" });
  if (status !== 0) throw new Error(`${command} ${args[0]} failed (exit ${status})`);
};

// The phone is chosen before the build, which takes minutes. The native project
// is already prebuilt and checked.
export const installOnDevice = ({ env, teamId, configuration = "Debug" }) => {
  const choice = chooseDevice(listDevices());
  if (choice.refusal) throw new Error(choice.refusal);
  step("xcodebuild", xcodebuildArgs({ udid: choice.udid, teamId, configuration }), env);
  step("xcrun", installArgs(choice.udid, configuration), env);
  // A free Personal Team's developer is untrusted on first install, so the launch is refused; the install has still happened.
  const launch = spawnSync("xcrun", launchArgs(choice.udid), { cwd: ROOT, env, stdio: "inherit" });
  if (launch.status !== 0) console.log(LAUNCH_REFUSED);
};
