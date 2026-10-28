#!/usr/bin/env node
// Fails when text bound for GitHub carries an absolute path from the machine
// it was written on: a home directory names the user and lays out their disk,
// and once pushed it cannot be taken back (the CLAUDE.md host-data rule this
// backs). A rule in prose alone is what ADR-0039 says agents break. Sibling of
// the other check-*.mjs checkers: plain Node, no dependencies, and a fixture
// self-test in check-no-host-paths.test.mjs.
//
// With no arguments it reads every file `git ls-files` lists, so a staged file
// counts and an ignored one does not. With `--file` it reads only the files
// named, which is how .github/workflows/pr-body.yml checks a PR's title,
// description and commit messages — text no tracked file holds.
//
// A failure names the file, line and kind of path but never the path itself:
// CI logs of a public repository are public, and echoing the match there
// would publish what the check exists to stop.
//
// Tokens and passwords are out of scope; GitHub secret scanning recognises
// those by provider, which a pattern list here could not keep up with.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

// The lookbehind keeps a URL path out (`example.com/home/x`); GitHub Actions'
// runner home is CI's machine, not a person's, and shows up in pasted CI logs.
const HOST_PATHS = [
  { kind: "a macOS home directory", pattern: /(?<![\w.-])\/Users\/[\w.-]+/ },
  { kind: "a Linux home directory", pattern: /(?<![\w.-])\/home\/(?!runner\/)[\w.-]+/ },
  { kind: "a Windows home directory", pattern: /\b[A-Za-z]:\\+Users\\+[\w.-]+/i },
  { kind: "a macOS temporary directory", pattern: /(?<![\w.-])\/(?:private\/tmp|(?:private\/)?var\/folders)\// },
];

// See check-no-raster-images.mjs: a git hook's GIT_DIR would point git at
// the hook's repository instead of `root`.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

/**
 * @param {string} name file name to report
 * @param {string} text the file's contents
 * @returns {string[]} one message per offending line; empty means OK
 */
export function findHostPaths(name, text) {
  const failures = [];
  text.split("\n").forEach((line, i) => {
    for (const { kind, pattern } of HOST_PATHS) {
      if (pattern.test(line)) failures.push(`${name}:${i + 1} holds ${kind}`);
    }
  });
  return failures;
}

/**
 * @param {string} root repository root to check
 * @returns {string[]} one message per offending line in a tracked text file
 */
export function checkTrackedFiles(root) {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, env: ENV_WITHOUT_REPO, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  return tracked.flatMap((file) => {
    let text;
    try {
      text = readFileSync(resolve(root, file), "utf8");
    } catch {
      return []; // deleted in the working tree but still in the index
    }
    return text.includes("\0") ? [] : findHostPaths(file, text);
  });
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const files = process.argv.flatMap((a, i) => (process.argv[i - 1] === "--file" ? [a] : []));
  const failures =
    files.length > 0
      ? files.flatMap((f) => findHostPaths(f, readFileSync(f, "utf8")))
      : checkTrackedFiles(resolve(SELF_DIR, ".."));
  console.log(`Checking that ${files.length > 0 ? files.join(", ") : "tracked files"} hold no absolute host path\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  if (failures.length > 0) {
    console.log("\nWrite a path relative to the repository root, or drop it (CLAUDE.md, host data).");
  }
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
