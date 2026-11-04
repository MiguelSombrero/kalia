#!/usr/bin/env node
// Self-test for app.config.js. Runs in `npm test --workspace mobile`.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const appJson = require("../app.json");
const appConfig = require("../app.config.js");

const configWith = (teamId) => {
  const previous = process.env.KALIA_APPLE_TEAM_ID;
  try {
    if (teamId === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
    else process.env.KALIA_APPLE_TEAM_ID = teamId;
    return appConfig({ config: structuredClone(appJson.expo) });
  } finally {
    if (previous === undefined) delete process.env.KALIA_APPLE_TEAM_ID;
    else process.env.KALIA_APPLE_TEAM_ID = previous;
  }
};

test("the team identifier in the environment reaches the iOS config, beside the rest of it", () => {
  const { ios } = configWith("AB12CD34EF");
  assert.equal(ios.appleTeamId, "AB12CD34EF");
  assert.equal(ios.bundleIdentifier, "fi.kalia.app");
});

test("with no team identifier the config is app.json's, unchanged", () => {
  assert.deepEqual(configWith(undefined), appJson.expo);
  assert.deepEqual(configWith(""), appJson.expo);
});
