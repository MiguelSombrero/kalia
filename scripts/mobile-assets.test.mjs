#!/usr/bin/env node
// Self-test for mobile-assets.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

import { OUT_DIR, ROOT, SOURCE, images, parseMark, renderAssets } from "./mobile-assets.mjs";

const appJson = JSON.parse(readFileSync(join(ROOT, "mobile/app.json"), "utf8")).expo;
const mark = parseMark(readFileSync(SOURCE, "utf8"));

const named = () => {
  const splash = appJson.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");
  return [
    appJson.icon,
    appJson.android.adaptiveIcon.foregroundImage,
    splash[1].image,
    ...[appJson.ios?.icon, appJson.android.icon].filter((icon) => typeof icon === "string"),
  ];
};

const pixel = async (file, x, y) => {
  const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * 4;
  return [...data.subarray(at, at + 4)];
};

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

test("every image app.json names is rendered from the SVG source, as 1024 px squares", async () => {
  const out = mkdtempSync(join(tmpdir(), "mobile-assets-"));
  try {
    const written = await renderAssets(out);
    for (const path of named()) {
      assert.equal(path.startsWith("./assets/generated/"), true, `${path} is outside the generated directory`);
      const name = path.slice("./assets/generated/".length);
      assert.ok(written.includes(name), `${path} is named by app.json and not rendered`);
      const meta = await sharp(join(out, name)).metadata();
      assert.deepEqual([meta.format, meta.width, meta.height], ["png", 1024, 1024], name);
    }
  } finally {
    rmSync(out, { recursive: true });
  }
});

test("the script renders into the directory app.json names", () => {
  assert.equal(OUT_DIR, join(ROOT, "mobile/assets/generated"));
});

test("the home-screen icon is the tile full bleed and opaque, as iOS requires", async () => {
  const out = mkdtempSync(join(tmpdir(), "mobile-assets-"));
  try {
    await renderAssets(out);
    const file = join(out, "icon.png");
    assert.equal((await sharp(file).metadata()).hasAlpha, false);
    assert.deepEqual((await pixel(file, 2, 2)).slice(0, 3), hex(mark.tileColor));
    assert.deepEqual((await pixel(file, 1021, 1021)).slice(0, 3), hex(mark.foamColor));
  } finally {
    rmSync(out, { recursive: true });
  }
});

test("the adaptive foreground is transparent at its corners and carries the foam to its bottom edge", async () => {
  const out = mkdtempSync(join(tmpdir(), "mobile-assets-"));
  try {
    await renderAssets(out);
    const file = join(out, "adaptive-icon-foreground.png");
    assert.equal((await pixel(file, 2, 2))[3], 0);
    assert.deepEqual(await pixel(file, 600, 1021), [...hex(mark.foamColor), 255]);
  } finally {
    rmSync(out, { recursive: true });
  }
});

test("the splash is transparent beside the mark and is the mark without its tile, with foam at its centre, for the teal it is shown on", async () => {
  const out = mkdtempSync(join(tmpdir(), "mobile-assets-"));
  try {
    await renderAssets(out);
    const file = join(out, "splash.png");
    assert.equal((await pixel(file, 2, 2))[3], 0);
    assert.deepEqual(await pixel(file, 601, 676), [...hex(mark.foamColor), 255]);
    const splash = appJson.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen")[1];
    assert.equal(splash.backgroundColor.toLowerCase(), mark.tileColor.toLowerCase());
  } finally {
    rmSync(out, { recursive: true });
  }
});

test("the adaptive background is the mark's tile colour", () => {
  assert.equal(appJson.android.adaptiveIcon.backgroundColor.toLowerCase(), mark.tileColor.toLowerCase());
});

test("a source that no longer opens with the tile is refused rather than rendered", () => {
  assert.throws(() => images('<svg viewBox="0 0 64 64"><circle cx="1" cy="1" r="1" fill="#ffffff"/></svg>'), /tile/);
});

test("the display name is Kalia in both locales, on both platforms", () => {
  for (const locale of ["en", "fi"]) {
    const strings = JSON.parse(readFileSync(join(ROOT, "mobile", appJson.locales[locale]), "utf8"));
    assert.equal(strings.ios.CFBundleDisplayName, "Kalia");
    assert.equal(strings.android.app_name, "Kalia");
  }
  assert.equal(appJson.name, "Kalia");
});

test("the identifier is fi.kalia.app on both platforms", () => {
  assert.equal(appJson.ios.bundleIdentifier, "fi.kalia.app");
  assert.equal(appJson.android.package, "fi.kalia.app");
});
