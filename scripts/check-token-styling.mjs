#!/usr/bin/env node
// ADR-0066: enforce the semantic token layer on both clients.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, sep } from "node:path";
import { tokens } from "../packages/tokens/src/tokens.ts";

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
export function checkTokenStyling(root, source = tokens) {
  const layers = {
    theme: new Set([
      ...source.colors.map((t) => `--color-${t.name}`),
      ...source.fonts.map((t) => `--font-${t.name}`),
      ...source.typography.map((t) => `--text-${t.name}`),
      ...source.radius.map((t) => `--radius-${t.name}`),
    ]),
    primitive: new Set([
      ...source.primitives.map((t) => `--${t.name}`),
      ...source.colors.map((t) => `--${t.name}`),
    ]),
  };
  const failures = [];
  for (const dir of ["web", "mobile/src"]) {
    for (const path of listFiles(resolve(root, dir), root)) {
      const rel = relative(root, path).split(sep).join("/");
      for (const { line, message } of checkFile(readFileSync(path, "utf8"), layers, rel.startsWith("mobile/src/"))) {
        failures.push(`${rel}:${line}: ${message}`);
      }
    }
  }
  return failures;
}

function listFiles(dir, root) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = resolve(dir, entry.name);
    const rel = relative(root, full).split(sep).join("/");
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...listFiles(full, root));
    } else if (SCANNED.test(entry.name) && !TEST_FILE.test(entry.name) && !["web/app/globals.css", "web/app/tokens.generated.css", "mobile/src/lib/design/theme.generated.ts"].includes(rel) && !rel.startsWith("mobile/src/testing/")) {
      out.push(full);
    }
  }
  return out;
}

/** @returns {{ line: number, message: string }[]} */
function checkFile(text, { theme, primitive }, mobile = false) {
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
    for (const { index, length, message } of findViolations(code, theme, primitive, mobile)) {
      violations.push({ line, index, length, message });
    }
    if (mobile) {
      const designValue = /\b(?:fontSize|fontWeight|lineHeight|letterSpacing|padding(?:Top|Bottom|Left|Right|Vertical|Horizontal|Start|End)?|margin(?:Top|Bottom|Left|Right|Vertical|Horizontal|Start|End)?|gap|rowGap|columnGap|borderRadius|border(?:TopLeft|TopRight|BottomLeft|BottomRight)Radius|duration|minHeight|minWidth)\s*:\s*(?:["']\d+["']|-?\d+(?:\.\d+)?)/g;
      for (const m of code.matchAll(designValue)) violations.push({ line, index: m.index, length: m[0].length, message: `static design value \`${m[0]}\`` });
      const literalColor = /\b(?:color|backgroundColor|border(?:Top|Bottom|Left|Right|Start|End)?Color|shadowColor|textDecorationColor|tintColor|overlayColor)\s*:\s*(["'])(.*?)\1/g;
      for (const m of code.matchAll(literalColor)) {
        if (!COLOUR_KEYWORD.test(m[2])) violations.push({ line, index: m.index, length: m[0].length, message: `literal colour \`${m[0]}\`` });
      }
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

function* findViolations(code, theme, primitive, mobile) {
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
    if (mobile && /^\s*theme\.fonts(?:\.[\w]+|\[["'][\w-]+["']\])\s*[,;}]/.test(m[1])) continue;
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
  console.log("Checking web and mobile styling against the semantic token layer (ADR-0066)\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
