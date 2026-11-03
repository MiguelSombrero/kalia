#!/usr/bin/env node
// Renders the PNGs the mobile app's icon and splash configuration names, from
// the mark's SVG, into mobile/assets/generated/, which git ignores like every
// raster image (no PNG is committed, as ios/ and android/ are not, ADR-0094):
//   node scripts/mobile-assets.mjs
// `expo prebuild` reads them, so every script that runs it runs this first. The
// SVG is the one the web serves as its favicon, itself pinned by a test to the
// geometry in web/lib/kaliaMark.ts; this file reads it and owns no shape.

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE = join(ROOT, "web/app/icon.svg");
export const OUT_DIR = join(ROOT, "mobile/assets/generated");

const PX = 1024;
const MARK = 64;
// An Android adaptive icon is a 108 dp canvas of which only the middle 66 dp
// is safe from every launcher's mask; the mark fills the 72 dp the masks show.
const ADAPTIVE_CANVAS = (MARK * 108) / 72;
const ADAPTIVE_INSET = (ADAPTIVE_CANVAS - MARK) / 2;

// Android 12 and later draw the splash image through a circle a third narrower
// than its canvas, so the canvas is sized for that circle to hold the mark's
// whole foam, whose outermost circle ends 50 units from the tile's centre; the
// foam is not clipped to the tile here, so it shows its own rounded bottom.
const SPLASH_RADIUS = 50;
const SPLASH_CANVAS = SPLASH_RADIUS * 3;
const SPLASH_INSET = (SPLASH_CANVAS - MARK) / 2;

const TILE = /<rect [^>]*\/>/;

export const parseMark = (svg) => {
  const inner = svg.replace(/^\s*<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const tile = inner.match(TILE)?.[0];
  const color = tile?.match(/fill="(#[0-9a-f]{6})"/i)?.[1];
  const foam = [...inner.matchAll(/<circle [^>]*fill="(#[0-9a-f]{6})"/gi)].at(-1)?.[1];
  if (!tile || !color || !foam) throw new Error(`${SOURCE} no longer starts with the mark's tile or ends with its foam`);
  return { inner, withoutTile: inner.replace(TILE, ""), tileColor: color, foamColor: foam };
};

// The mark's foam runs off the tile's bottom edge; on the adaptive canvas that
// edge is inside the picture, so the foam is carried straight down from the
// leftmost and rightmost points of its outer circles to the canvas's edge.
const foamBleed = (foam, extent) =>
  `<rect x="13.5" y="62" width="56.5" height="${extent - 62}" fill="${foam}"/>`;

const svgOf = (viewBox, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="${viewBox}">${body}</svg>`);

/** @returns {Record<string, { svg: Buffer, opaque: boolean }>} file name -> what to rasterise */
export const images = (source = readFileSync(SOURCE, "utf8")) => {
  const { inner, withoutTile, foamColor } = parseMark(source);
  const edge = MARK + ADAPTIVE_INSET;
  return {
    "icon.png": { svg: svgOf(`0 0 ${MARK} ${MARK}`, inner), opaque: true },
    "adaptive-icon-foreground.png": {
      svg: svgOf(
        `${-ADAPTIVE_INSET} ${-ADAPTIVE_INSET} ${ADAPTIVE_CANVAS} ${ADAPTIVE_CANVAS}`,
        withoutTile + foamBleed(foamColor, edge),
      ),
      opaque: false,
    },
    "splash.png": {
      svg: svgOf(`${-SPLASH_INSET} ${-SPLASH_INSET} ${SPLASH_CANVAS} ${SPLASH_CANVAS}`, withoutTile),
      opaque: false,
    },
  };
};

export const renderAssets = async (outDir = OUT_DIR, source) => {
  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const [name, { svg, opaque }] of Object.entries(images(source))) {
    const raster = sharp(svg);
    await (opaque ? raster.flatten({ background: "#ffffff" }).removeAlpha() : raster).png().toFile(join(outDir, name));
    written.push(name);
  }
  return written;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of await renderAssets()) console.log(`rendered mobile/assets/generated/${name}`);
}
