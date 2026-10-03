#!/usr/bin/env node
// Every token globals.css's `@theme` blocks declare has exactly one
// meaning row in docs/design.md, and every row names a token that still exists
// (ADR-0063). Plain Node with no dependencies, like check-glossary.mjs, and
// self-tested against fixtures for the same reason: the real tree never trips
// it once docs/design.md is current.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} root repository root to check
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkDesignTokens(root) {
  const cssPath = resolve(root, "frontend/app/globals.css");
  const designPath = resolve(root, "docs/design.md");

  let css;
  try {
    css = readFileSync(cssPath, "utf8");
  } catch {
    return [`frontend/app/globals.css not found at ${cssPath}`];
  }
  let design;
  try {
    design = readFileSync(designPath, "utf8");
  } catch {
    return [`docs/design.md not found at ${designPath}`];
  }

  const declared = themeTokens(css);
  if (declared === null) {
    return ["frontend/app/globals.css: no `@theme` block — nothing declares the semantic layer"];
  }
  const rows = meaningRows(design);
  if (rows === null) {
    return ['docs/design.md: no "## Semantic tokens" section to hold each token\'s meaning'];
  }

  const failures = [];
  for (const token of declared) {
    const count = rows.filter((r) => r === token).length;
    if (count === 0) {
      failures.push(
        `docs/design.md: \`${token}\` is declared in a globals.css @theme block but has no meaning row ` +
          `(add one under "## Semantic tokens")`,
      );
    } else if (count > 1) {
      failures.push(`docs/design.md: \`${token}\` has ${count} meaning rows; a token means one thing`);
    }
  }
  for (const token of new Set(rows)) {
    if (!declared.includes(token)) {
      failures.push(
        `docs/design.md: the "Semantic tokens" section has a row for \`${token}\`, ` +
          `which no globals.css @theme block declares`,
      );
    }
  }
  return failures;
}

// Every `@theme` block counts, inline or not and however many there are: each
// one generates the Tailwind utilities components consume.
function themeTokens(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...source.matchAll(/@theme\b[^{;]*\{/g)];
  if (blocks.length === 0) return null;

  const tokens = new Set();
  for (const block of blocks) {
    const open = block.index + block[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      if (source[end] === "{") depth++;
      if (source[end] === "}" && --depth === 0) break;
    }
    for (const m of source.slice(open + 1, end).matchAll(/(--[A-Za-z0-9-]+)\s*:/g)) {
      // `--text-label--line-height` is Tailwind's sub-property of `--text-label`, documented in its row.
      tokens.add(m[1].replace(/^(--.+?)--.*$/, "$1"));
    }
  }
  return [...tokens].sort();
}

// The first-column code spans of every table row from "## Semantic tokens" to
// the next heading of level one or two, so the section may group its rows
// under ### subheadings.
function meaningRows(design) {
  const lines = design.split("\n");
  const start = lines.findIndex((l) => /^##\s+Semantic tokens\s*$/.test(l));
  if (start === -1) return null;

  const tokens = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) break;
    const cell = lines[i].match(/^\|\s*`(--[A-Za-z0-9-]+)`\s*\|/);
    if (cell) tokens.push(cell[1]);
  }
  return tokens;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(SELF_DIR, "..");
  const failures = checkDesignTokens(root);
  console.log(`Checking docs/design.md against globals.css's @theme tokens\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
