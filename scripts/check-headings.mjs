#!/usr/bin/env node
// A page title is `PageTitle` and a section heading is `SectionHeading`, both
// from frontend/components/ui/ (ADR-0073): a literal <h1> or <h2> written in
// frontend/app/ or frontend/features/ fails. Plain Node with no dependencies,
// like check-token-styling.mjs, and self-tested against fixtures because the
// real tree passes: a checker that matched nothing would stay green.
//
// Only a literal JSX element outside a comment is matched. A heading whose tag
// is chosen at runtime (`const Heading = level === 3 ? "h3" : "h2"`, or
// `createElement("h2")`) is not, so review still owns that case.
//
// ALLOWLIST names each heading that is neither a page title nor a section
// heading, with its reason. An entry excuses exactly one element of its tag
// in its file, and an entry that excuses nothing fails, so it cannot outlive
// the heading it was taken for.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, sep } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const SCANNED_ROOTS = ["frontend/app", "frontend/features"];
const SCANNED = /\.tsx$/;
const TEST_FILE = /\.(test|spec)\.tsx$/;
const IGNORED_DIRS = new Set(["node_modules"]);
const HEADING = /<(h[12])(?=[\s>/])/g;
const COMMENT = /\/\*[\s\S]*?\*\/|(?<![:"'`])\/\/.*$/gm;

/** @type {{ path: string, tag: "h1" | "h2", reason: string }[]} */
export const ALLOWLIST = [
  {
    path: "frontend/features/cellar/CellarBeerList.tsx",
    tag: "h2",
    reason: "a beer's name heading its own row in the cellar, neither a page title nor a section heading",
  },
];

/**
 * @param {string} root repository root to check
 * @param {typeof ALLOWLIST} allowlist the excused headings
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkHeadings(root, allowlist = ALLOWLIST) {
  const remaining = new Map(allowlist.map((entry) => [`${entry.path}:${entry.tag}`, entry]));
  const failures = [];

  for (const scanned of SCANNED_ROOTS) {
    for (const path of listFiles(resolve(root, scanned))) {
      const rel = relative(root, path).split(sep).join("/");
      const text = readFileSync(path, "utf8").replace(COMMENT, (c) => c.replace(/[^\n]/g, " "));
      for (const match of text.matchAll(HEADING)) {
        if (remaining.delete(`${rel}:${match[1]}`)) continue;
        const line = text.slice(0, match.index).split("\n").length;
        const component = match[1] === "h1" ? "PageTitle" : "SectionHeading";
        failures.push(
          `${rel}:${line}: a hand-written <${match[1]}>; use \`${component}\` from components/ui/, ` +
            "or add it to ALLOWLIST in scripts/check-headings.mjs with its reason",
        );
      }
    }
  }

  for (const entry of remaining.values()) {
    failures.push(`${entry.path}: ALLOWLIST entry for <${entry.tag}> excuses nothing; remove it`);
  }
  return failures;
}

function listFiles(dir) {
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
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) out.push(...listFiles(full));
    } else if (SCANNED.test(entry.name) && !TEST_FILE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(SELF_DIR, "..");
  const failures = checkHeadings(root);
  console.log("Checking that page titles and section headings come from components/ui/ (ADR-0073)\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
