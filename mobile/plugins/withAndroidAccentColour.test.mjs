#!/usr/bin/env node
// Self-test for withAndroidAccentColour.js. Runs in `npm test --workspace mobile`.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { tokens } from "../../packages/tokens/src/tokens.ts";

const require = createRequire(import.meta.url);
const appJson = require("../app.json");
const { applyToColors, applyToStyles } = require("./withAndroidAccentColour.js");

const [, options] = appJson.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "./plugins/withAndroidAccentColour");
const primary = tokens.colors.find((color) => color.name === "primary");
const valueOf = (name) => tokens.primitives.find((primitive) => primitive.name === name).value;

test("the colours the app config hands the plugin are the primary token's two modes", () => {
  assert.deepEqual(options, { light: valueOf(primary.light), dark: valueOf(primary.dark) });
});

test("the accent colour is written once, with the value of the mode asked for", () => {
  const colors = applyToColors(applyToColors({ resources: {} }, options.dark), options.light);
  assert.deepEqual(colors.resources.color, [{ $: { name: "kaliaAccent" }, _: options.light }]);
});

test("the app theme takes the accent, and no dialog is given a theme of its own", () => {
  const appTheme = { $: { name: "AppTheme", parent: "Theme.AppCompat.DayNight.NoActionBar" }, item: [] };
  const styles = applyToStyles({ resources: { style: [appTheme] } });
  assert.equal(styles.resources.style.length, 1);
  assert.deepEqual(styles.resources.style[0].item, [{ $: { name: "colorAccent" }, _: "@color/kaliaAccent" }]);
});
