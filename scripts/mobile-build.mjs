// What building the mobile app is, shared by the development targets
// (mobile-native.mjs) and the end-to-end build (mobile-e2e.mjs): the
// environment a build gets, the steps that make its native project, and the
// refusals that stop a build which could not work. Two variants exist:
// a development build, with the dev menu and Metro, and a release
// build, with its JavaScript inside and no dev menu.
//
// `expo run:*` reuses an existing `ios/` or `android/`, which would keep the
// previous build's cleartext exception, origins and build number. So every
// build runs `expo prebuild` first, whatever the project holds, then checks the
// result for a cleartext exception it may not carry, and only then builds.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { mobileEnv } from "./mobile-env.mjs";
import { phoneModeRefusal } from "./phone-mode.mjs";
import { ROOT, phoneHostOf } from "./stack-ports.mjs";

export const PLATFORMS = ["ios", "ios-device", "android"];
export const VARIANTS = ["development", "release"];

const CHECK = resolve(ROOT, "mobile/scripts/check-cleartext.mjs");

const nativePlatform = (platform) => (platform === "android" ? "android" : "ios");

export const makeTarget = (platform, variant) => `make mobile-${platform}${variant === "release" ? "-release" : ""}`;

// The environment `expo prebuild` and the bundle are made with. Every variable
// is set, empty when off, so one exported in the developer's shell cannot leak
// into a build that did not ask for it. KALIA_E2E is the Android release
// build's: the one that dials `localhost` over plain HTTP (the build
// `make mobile-e2e` runs).
export const buildEnv = (stack, { platform, variant }) => ({
  ...mobileEnv(stack),
  KALIA_PHONE_HOST: phoneHostOf(stack) ?? "",
  KALIA_E2E: platform === "android" && variant === "release" ? "1" : "",
});

export const prebuildStep = (platform) => ({ command: "npm", args: ["run", `${nativePlatform(platform)}:prebuild`, "--workspace", "mobile"] });

export const checkStep = (platform) => ({ command: "node", args: [CHECK, nativePlatform(platform)] });

export const projectSteps = (platform) => [prebuildStep(platform), checkStep(platform)];

export const releaseFlags = (platform) => (platform === "android" ? ["--variant", "release", "--no-bundler"] : ["--configuration", "Release", "--no-bundler"]);

// Why this build cannot work, or undefined. Android's `adb reverse` forwards
// `localhost` only, which in phone mode is no longer the issuer (ADR-0097); a
// release build on the iPhone has its origins fixed at build time, and without
// phone mode they are `localhost`, which on a phone is the phone.
export const refusal = (stack, { platform, variant }) => {
  if (platform === "android") return phoneModeRefusal(stack, makeTarget(platform, variant));
  if (platform === "ios-device" && variant === "release" && !phoneHostOf(stack)) {
    return `${makeTarget(platform, variant)} needs phone mode: the release build has its origins fixed when it is built, and without phone mode they are localhost, which on a phone is the phone. Run \`make phone-mode HOST=<the Mac's name>\` first (mobile/README.md, "Reach the stack from the iPhone").`;
  }
  return undefined;
};

export const buildPlan = (stack, { platform, variant, args = [] }) => {
  const problem = refusal(stack, { platform, variant });
  if (problem) return { problem, env: {}, steps: [] };
  const release = variant === "release";
  const build =
    platform === "ios-device"
      ? { command: "install-on-device", args: [], configuration: release ? "Release" : "Debug" }
      : { command: "npm", args: ["run", platform, "--workspace", "mobile", "--", ...(release ? releaseFlags(platform) : []), ...args] };
  return { env: buildEnv(stack, { platform, variant }), steps: [...projectSteps(platform), build] };
};

export const runSteps = (steps, env) => {
  for (const { command, args, cwd = ROOT } of steps) {
    const { status, signal } = spawnSync(command, args, { cwd, env, stdio: "inherit" });
    if (status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(" ")} exited with ${status ?? signal}`);
  }
};
