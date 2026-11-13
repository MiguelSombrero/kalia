#!/usr/bin/env node
// ADR-0107: hold documented pairings and variants to WCAG AA in both modes.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tokens } from "../packages/tokens/src/tokens.ts";
import { validateTokens } from "./generate-tokens.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const NEEDS = { text: 4.5, "non-text": 3 };
const MODES = { both: ["light", "dark"], light: ["light"] };

/**
 * @param {string} a hex colour, #rgb or #rrggbb
 * @param {string} b hex colour, #rgb or #rrggbb
 * @returns {number} WCAG 2.2 contrast ratio, 1–21
 */
export function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function luminance(hex) {
  const h = expand(hex).slice(1);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function expand(hex) {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

/**
 * @param {string} root repository root to check
 * @returns {{ failures: string[], results: { label: string, ratio: number, needs: number }[] }}
 */
export function checkContrast(root, source = tokens) {
  let design;
  try {
    design = readFileSync(resolve(root, "docs/design.md"), "utf8");
  } catch {
    return { failures: ["docs/design.md not found"], results: [] };
  }

  try {
    validateTokens(source);
  } catch (error) {
    return { failures: [error.message], results: [] };
  }
  const primitives = new Map(source.primitives.map((token) => [token.name, token.value]));
  const colors = new Map(source.colors.map((token) => [`--color-${token.name}`, token]));

  const pairings = declaredPairings(design);
  if (pairings === null) {
    return { failures: ['docs/design.md: no "## Contrast pairings" section declaring the pairings the app uses'], results: [] };
  }

  const failures = [];
  const results = [];
  const judge = (label, fg, bg, needs) => {
    const ratio = contrastRatio(fg, bg);
    results.push({ label, ratio, needs });
    if (ratio < needs) failures.push(`${label} is ${ratio.toFixed(2)}:1, needs ${needs}:1`);
  };

  for (const { fg, bg, kind, modes } of pairings) {
    const label = `\`${fg}\` on \`${bg}\``;
    if (!(kind in NEEDS)) {
      failures.push(`docs/design.md: ${label} has kind "${kind}"; use "text" or "non-text"`);
      continue;
    }
    if (!(modes in MODES)) {
      failures.push(`docs/design.md: ${label} has modes "${modes}"; use "both" or "light"`);
      continue;
    }
    const missing = [fg, bg].filter((t) => !colors.has(t));
    if (missing.length > 0) {
      failures.push(`docs/design.md: ${label} names \`${missing[0]}\`, which the token source does not declare`);
      continue;
    }
    for (const mode of MODES[modes]) judge(`${label} (${mode})`, primitives.get(colors.get(fg)[mode]), primitives.get(colors.get(bg)[mode]), NEEDS[kind]);
  }

  for (const group of source.variants) {
    for (const variant of group.values) {
      for (const mode of ["light", "dark"]) {
        judge(`[data-${group.name}="${variant.name}"] (${mode})`, primitives.get(variant[mode].foreground), primitives.get(variant[mode].background), NEEDS.text);
      }
    }
  }

  return { failures, results };
}

export function parseBlocks(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  for (const m of source.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    const decls = new Map();
    for (const d of m[2].matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) decls.set(d[1], d[2].trim());
    blocks.push({ selector: m[1].trim().replace(/\s+/g, " "), decls });
  }
  return blocks;
}

export function resolveColour(token, scope, seen = new Set()) {
  if (seen.has(token)) return null;
  seen.add(token);
  const value = scope.get(token);
  if (value === undefined) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return expand(value);
  const ref = value.match(/^var\(\s*(--[A-Za-z0-9-]+)\s*(?:,[^)]*)?\)$/);
  return ref ? resolveColour(ref[1], scope, seen) : null;
}

// Table rows from "## Contrast pairings" to the next heading of level one or
// two: | `--foreground-token` | `--background-token` | text or non-text | both or light |
// A row with no fourth cell holds in both modes.
function declaredPairings(design) {
  const lines = design.split("\n");
  const start = lines.findIndex((l) => /^##\s+Contrast pairings\s*$/.test(l));
  if (start === -1) return null;

  const pairings = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) break;
    const row = lines[i].match(/^\|\s*`(--[A-Za-z0-9-]+)`\s*\|\s*`(--[A-Za-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|(?:\s*([^|]*?)\s*\|)?/);
    if (row) pairings.push({ fg: row[1], bg: row[2], kind: row[3], modes: row[4] || "both" });
  }
  return pairings;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { failures, results } = checkContrast(resolve(SELF_DIR, ".."));
  console.log("Checking WCAG 2.2 AA contrast of semantic pairings and beer-style colours in both modes\n");
  for (const r of results) {
    console.log(`  ${r.ratio >= r.needs ? "ok  " : "FAIL"}  ${r.ratio.toFixed(2).padStart(5)}:1  (needs ${r.needs}:1)  ${r.label}`);
  }
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
