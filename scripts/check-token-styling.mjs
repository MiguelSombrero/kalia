#!/usr/bin/env node
// A component styles itself with a colour or a typeface only through the
// semantic token layer (ADR-0066, which makes ADR-0021's two-layer rule a
// build failure). Plain Node with no dependencies, like check-comments.mjs,
// and self-tested against fixtures because the real tree passes: a checker
// that matched nothing would stay green.
//
// What is read: every .ts/.tsx/.css file under frontend/ except app/globals.css
// (where values live), tests, e2e/, the generated API client and tooling
// directories. keycloak/themes/.../login.css is outside frontend/ and is a
// separate origin's stylesheet that cannot import the app's tokens.
//
// The semantic layer is whatever globals.css declares inside an `@theme`
// block; the primitive layer is every other custom property it declares. Both
// are read from the file, so a re-theme changes what is checked without
// touching this script.
//
// An exception is a `token-exception: <reason>` comment on the offending line
// or the line above it. It must state a reason of at least three words, and it
// must excuse something: a stale one fails, so an exception cannot outlive the
// violation it was taken for.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, sep } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const SCANNED = /\.(tsx?|css)$/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const IGNORED_DIRS = new Set([
  "node_modules", "coverage", "dist", "build", "playwright-report", "test-results", "e2e",
]);
const MARKER = /\btoken-exception\b/;
const MIN_REASON_WORDS = 3;

// Tailwind utilities whose value can be a colour.
const COLOUR_PREFIX =
  "(?:bg|text|border(?:-[xysetrbl])?|ring|ring-offset|inset-ring|outline|fill|stroke|from|via|to|divide|" +
  "shadow|inset-shadow|drop-shadow|text-shadow|accent|caret|decoration|placeholder)";
const PALETTE =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|" +
  "violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe)";

const HEX = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOUR_FUNCTION = /(?<![\w.$-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
const COLOUR_SPACE =
  /(?<![\w.$-])color\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\b/g;
const PALETTE_UTILITY = new RegExp(
  `(?<![\\w-])${COLOUR_PREFIX}-(?:white|black|${PALETTE}-\\d{2,3})(?![\\w-])`,
  "g",
);
const ARBITRARY_COLOUR = new RegExp(`(?<![\\w-])${COLOUR_PREFIX}-\\[([^\\]]*)\\]`, "g");
const SHORTHAND_VAR = new RegExp(`(?<![\\w-])(?:${COLOUR_PREFIX}|font)-\\(\\s*(?:[\\w-]+:)?(--[\\w-]+)`, "g");
const ARBITRARY_FONT = /(?<![\w-])font-\[([^\]]*)\]/g;
const VAR_REFERENCE = /var\(\s*(--[\w-]+)/g;
const FONT_FAMILY = /(?:font-family|fontFamily)\s*:(.*)/g;

// An arbitrary value that is not a colour: a length, a number, or a typed
// value Tailwind resolves as something else.
const NOT_A_COLOUR =
  /^(?:[-+]?[\d.]|(?:calc|clamp|min|max|url)\(|(?:length|percentage|number|integer|position|size|bg-size|angle|line-width|url|image|ratio):)/;

// Not a colour of its own: nothing a re-theme could change.
const COLOUR_KEYWORD = /^(?:transparent|currentcolor|inherit|initial|unset)$/i;

/**
 * @param {string} root repository root to check
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkTokenStyling(root) {
  const cssPath = resolve(root, "frontend/app/globals.css");
  let css;
  try {
    css = readFileSync(cssPath, "utf8");
  } catch {
    return [`frontend/app/globals.css not found at ${cssPath}`];
  }
  const layers = readLayers(css);
  if (layers === null) {
    return ["frontend/app/globals.css: no `@theme` block — nothing declares the semantic layer to check against"];
  }

  const frontend = resolve(root, "frontend");
  const failures = [];
  for (const path of listFiles(frontend, root)) {
    const rel = relative(root, path).split(sep).join("/");
    for (const { line, message } of checkFile(readFileSync(path, "utf8"), layers)) {
      failures.push(`${rel}:${line}: ${message}`);
    }
  }
  return failures;
}

function listFiles(dir, root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = resolve(dir, entry.name);
    const rel = relative(root, full).split(sep).join("/");
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || rel === "frontend/lib/api/generated") continue;
      out.push(...listFiles(full, root));
    } else if (SCANNED.test(entry.name) && !TEST_FILE.test(entry.name) && rel !== "frontend/app/globals.css") {
      out.push(full);
    }
  }
  return out;
}

/** The custom properties declared inside `@theme` blocks, and those declared anywhere else. */
function readLayers(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...source.matchAll(/@theme\b[^{;]*\{/g)];
  if (blocks.length === 0) return null;

  const theme = new Set();
  let outside = source;
  for (const block of [...blocks].reverse()) {
    const open = block.index + block[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      if (source[end] === "{") depth++;
      if (source[end] === "}" && --depth === 0) break;
    }
    for (const m of source.slice(open + 1, end).matchAll(/(--[\w-]+)\s*:/g)) theme.add(m[1]);
    outside = outside.slice(0, block.index) + outside.slice(end + 1);
  }
  const primitive = new Set([...outside.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  return { theme, primitive };
}

/** @returns {{ line: number, message: string }[]} */
function checkFile(text, { theme, primitive }) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const violations = [];
  const markers = [];
  let inBlock = false;

  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const trimmed = raw.trim();

    const marker = raw.match(MARKER);
    if (marker) markers.push({ line, valid: reasonWords(raw.slice(marker.index + marker[0].length)) >= MIN_REASON_WORDS });

    if (inBlock) {
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }
    if (trimmed.startsWith("/*")) {
      inBlock = !trimmed.includes("*/");
      return;
    }
    if (trimmed.startsWith("//")) return;

    const code = raw.replace(/\/\*.*?\*\//g, " ");
    for (const { index, length, message } of findViolations(code, theme, primitive)) {
      violations.push({ line, index, length, message });
    }
  });

  const failures = [];
  const used = new Set();
  const excused = (line) =>
    markers.filter((m) => m.valid && (m.line === line || m.line === line - 1)).map((m) => m.line);

  for (const { line, message } of dropContained(violations)) {
    const by = excused(line);
    if (by.length > 0) {
      by.forEach((l) => used.add(l));
    } else {
      failures.push({ line, message: `${message}; use a semantic token, or take a deliberate exception with \`token-exception: <why>\` on or above this line` });
    }
  }
  for (const { line, valid } of markers) {
    if (!valid) {
      failures.push({ line, message: `\`token-exception\` states no reason (at least ${MIN_REASON_WORDS} words saying why), so it excuses nothing` });
    } else if (!used.has(line)) {
      failures.push({ line, message: "`token-exception` excuses nothing: no violation on this line or the next — remove it" });
    }
  }
  return failures.sort((a, b) => a.line - b.line);
}

function reasonWords(afterMarker) {
  const reason = afterMarker
    .replace(/^[\s:–—-]+/, "")
    .replace(/\s*\*\/\s*\}?\s*$/, "")
    .replace(/\s*\}\s*$/, "")
    .trim();
  return reason === "" ? 0 : reason.split(/\s+/).length;
}

/** Keeps only the widest of overlapping hits, so one mistake is one failure. */
function dropContained(violations) {
  const sorted = [...violations].sort((a, b) => a.line - b.line || a.index - b.index || b.length - a.length);
  const kept = [];
  for (const v of sorted) {
    const outer = kept.find((k) => k.line === v.line && k.index <= v.index && v.index + v.length <= k.index + k.length);
    if (!outer) kept.push(v);
  }
  return kept;
}

function* findViolations(code, theme, primitive) {
  const hit = (m, message) => ({ index: m.index, length: m[0].length, message });

  for (const m of code.matchAll(HEX)) yield hit(m, `hex colour literal \`${m[0]}\``);
  for (const m of code.matchAll(COLOUR_FUNCTION)) yield hit(m, `colour function \`${m[0]}…)\``);
  for (const m of code.matchAll(COLOUR_SPACE)) yield hit(m, `colour function \`${m[0]}…)\``);
  for (const m of code.matchAll(PALETTE_UTILITY)) yield hit(m, `Tailwind default-palette utility \`${m[0]}\``);

  for (const m of code.matchAll(ARBITRARY_COLOUR)) {
    const value = m[1].trim();
    const semantic = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (NOT_A_COLOUR.test(value) || COLOUR_KEYWORD.test(value) || (semantic && theme.has(semantic[1]))) continue;
    yield hit(m, `arbitrary colour value \`${m[0]}\``);
  }
  for (const m of code.matchAll(ARBITRARY_FONT)) {
    if (/^(?:\d+|(?:weight|number):.*)$/.test(m[1].trim())) continue;
    yield hit(m, `arbitrary typeface value \`${m[0]}\``);
  }
  for (const m of code.matchAll(VAR_REFERENCE)) {
    if (primitive.has(m[1])) yield hit(m, `reference to the primitive layer \`${m[1]}\``);
  }
  for (const m of code.matchAll(SHORTHAND_VAR)) {
    if (primitive.has(m[1])) yield hit(m, `reference to the primitive layer \`${m[0]}…)\``);
  }
  for (const m of code.matchAll(FONT_FAMILY)) {
    const semantic = m[1].trim().match(/^["'`]?var\(\s*(--[\w-]+)\s*\)["'`]?[\s,;})]*$/);
    if (semantic && theme.has(semantic[1])) continue;
    yield hit(m, "typeface set by hand; use a `font-*` utility or `var(--font-…)` of a semantic font token");
  }
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(SELF_DIR, "..");
  const failures = checkTokenStyling(root);
  console.log("Checking frontend/ styling against the semantic token layer (ADR-0066)\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
