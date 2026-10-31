#!/usr/bin/env node
// Fails when a relative link in a tracked Markdown file resolves to no file or
// directory. Sibling of the other check-*.mjs checkers: plain Node, no
// dependencies, and a fixture self-test in check-links.test.mjs.
//
// Only the path is checked. A `#heading` fragment is dropped rather than
// matched against the target's headings, and so is a `:42` line suffix.
// Links inside fenced code blocks and inline code spans are examples, not
// links, so they are skipped.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "..");

const INLINE_LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|(?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE_DEFINITION = /^ {0,3}\[(?!\^)[^\]]+\]:\s*(<[^>]*>|\S+)/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// The pre-push hook runs this through `make verify-fast` with GIT_DIR and its
// siblings exported, which would point `git ls-files` at the hook's repository
// rather than ROOT; check-no-raster-images.mjs strips them for the same reason.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

const stripCodeSpans = (line) => line.replace(/(`+)[\s\S]*?\1/g, "");

/**
 * @param {string} text a Markdown file's contents
 * @returns {{line: number, target: string}[]} every link target outside code
 */
export function linkTargets(text) {
  const targets = [];
  let fence = null;
  text.split("\n").forEach((raw, index) => {
    const marker = raw.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker && !fence) {
      fence = marker[1];
      return;
    }
    if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && marker[2].trim() === "") {
      fence = null;
      return;
    }
    if (fence) return;
    const line = stripCodeSpans(raw);
    const definition = line.match(REFERENCE_DEFINITION);
    if (definition) targets.push({ line: index + 1, target: definition[1] });
    for (const match of line.matchAll(INLINE_LINK)) targets.push({ line: index + 1, target: match[1] });
  });
  return targets;
}

/**
 * The repository-relative path a link points at, or null when it is not a
 * relative link to a file (a URL, a mail address, a fragment on this page).
 *
 * @param {string} from the linking file, relative to the repository root
 * @param {string} target the link target as written
 */
export function resolveTarget(from, target) {
  let path = target.replace(/^<|>$/g, "");
  if (path === "" || path.startsWith("#") || SCHEME.test(path)) return null;
  path = path.replace(/[?#].*$/, "").replace(/:\d+(-\d+)?$/, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // A stray % is part of the name, so the path is checked as written.
  }
  return path.startsWith("/") ? posix.normalize(path.slice(1)) : posix.join(posix.dirname(from), path);
}

/**
 * @param {Record<string, string>} files Markdown contents keyed by repository-relative path
 * @param {(path: string) => boolean} exists whether a repository-relative path exists
 * @returns {string[]} one message per broken link; empty means OK
 */
export function checkLinks(files, exists) {
  const failures = [];
  for (const [from, text] of Object.entries(files)) {
    for (const { line, target } of linkTargets(text)) {
      const path = resolveTarget(from, target);
      if (path !== null && (path.startsWith("..") || !exists(path))) {
        failures.push(`${from}:${line} links to ${target}, which resolves to no file (${path})`);
      }
    }
  }
  return failures;
}

/**
 * @param {string} root repository root; every Markdown file git tracks under it is read
 * @returns {{scanned: string[], failures: string[]}}
 */
export function checkRepositoryLinks(root) {
  const scanned = execFileSync("git", ["ls-files", "-z", "--", "*.md"], { cwd: root, env: ENV_WITHOUT_REPO, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const files = Object.fromEntries(scanned.map((p) => [p, readFileSync(resolve(root, p), "utf8")]));
  return { scanned, failures: checkLinks(files, (p) => existsSync(resolve(root, p))) };
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { scanned, failures } = checkRepositoryLinks(ROOT);
  console.log(`Checking relative links in ${scanned.length} tracked Markdown files\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
