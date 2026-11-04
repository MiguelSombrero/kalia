#!/usr/bin/env node
// Self-test for app.config.js and buildNumber.js. Runs in `npm test --workspace mobile`.

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const appJson = require("../app.json");
const { buildNumberAt, MAX_VERSION_CODE } = require("../buildNumber.js");

// app.config.js keeps the first evaluation's build number, so each build
// starts from a fresh load of it, as each `expo prebuild` process does.
const evaluate = (at, teamId) => {
  const previous = process.env.KALIA_APPLE_TEAM_ID;
  mock.timers.enable({ apis: ["Date"], now: at });
  try {
    if (teamId === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
    else process.env.KALIA_APPLE_TEAM_ID = teamId;
    delete require.cache[require.resolve("../app.config.js")];
    const load = () => require("../app.config.js")({ config: structuredClone(appJson.expo) });
    return { config: load(), load };
  } finally {
    mock.timers.reset();
    if (previous === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
    else process.env.KALIA_APPLE_TEAM_ID = previous;
  }
};

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);

test("the team identifier in the environment reaches the iOS config, beside the rest of it", () => {
  const { ios } = evaluate(NOW, "AB12CD34EF").config;
  assert.equal(ios.appleTeamId, "AB12CD34EF");
  assert.equal(ios.bundleIdentifier, "fi.kalia.app");
});

test("with no team identifier the config is app.json's, plus the two build columns", () => {
  for (const teamId of [undefined, ""]) {
    const { config } = evaluate(NOW, teamId);
    const { buildNumber, ...ios } = config.ios;
    const { versionCode, ...android } = config.android;
    assert.deepEqual({ ...config, ios, android }, appJson.expo);
    assert.ok(buildNumber && versionCode);
  }
});

test("app.json carries neither build column, so nothing is edited by hand", () => {
  assert.equal("buildNumber" in appJson.expo.ios, false);
  assert.equal("versionCode" in appJson.expo.android, false);
  assert.match(appJson.expo.version, /^\d+\.\d+\.\d+$/);
});

test("both platforms get the same build number, as an integer in Android's versionCode range", () => {
  const { ios, android } = evaluate(NOW).config;
  assert.equal(ios.buildNumber, String(android.versionCode));
  assert.ok(Number.isInteger(android.versionCode));
  assert.ok(android.versionCode >= 1 && android.versionCode <= MAX_VERSION_CODE);
});

test("a later build has a higher number, even a second later", () => {
  const earlier = evaluate(NOW).config.android.versionCode;
  assert.ok(evaluate(NOW + 1000).config.android.versionCode > earlier);
  assert.ok(evaluate(NOW + 86_400_000).config.android.versionCode > earlier);
});

test("one prebuild evaluating the config again keeps its build number, though the clock has moved", () => {
  const { config, load } = evaluate(NOW);
  mock.timers.enable({ apis: ["Date"], now: NOW + 5000 });
  try {
    assert.equal(load().android.versionCode, config.android.versionCode);
  } finally {
    mock.timers.reset();
  }
});

test("the number stays within Android's range until 2092 and a clock outside it is refused", () => {
  assert.ok(buildNumberAt(Date.UTC(2091, 11, 31)) <= MAX_VERSION_CODE);
  assert.throws(() => buildNumberAt(Date.UTC(2093, 0, 1)), /outside 1\.\./);
  assert.throws(() => buildNumberAt(Date.UTC(2025, 11, 31)), /outside 1\.\./);
  assert.throws(() => buildNumberAt(Number.NaN), /outside 1\.\./);
});
