#!/usr/bin/env node
// Fails when backend Java builds a multiline string by concatenation instead
// of a text block (backend/README.md "Text blocks (`"""`), not string
// concatenation"). The rule was raised in review on #427 and #435 and
// regressed in #450 and #452, which ADR-0039 says is the case for a checker
// over another reminder. Sibling of the other check-*.mjs checkers: plain Node,
// no dependencies, a fixture self-test in check-text-blocks.test.mjs.
//
// A violation is a plain string literal whose preceding `+` is the first or
// the last token on its line: that is a literal continued across lines. A
// literal joined to a constant on one line (`"1-" + MAX`) is not, and a text
// block is always allowed after a `+`, which is how a multiline string
// interpolates a constant where an annotation value needs a compile-time
// constant (`""" … """ + MAX + """ … """`).
//
// The scan skips comments, character literals and the inside of text blocks,
// so a `+ "` quoted in any of them is not a violation. It does not parse Java:
// `x\n + y + "b"` slips through, which the review still catches.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

// See check-no-raster-images.mjs: a git hook's GIT_DIR would point git at
// the hook's repository instead of `root`.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

/**
 * @param {string} name file name to report
 * @param {string} text the file's contents
 * @returns {string[]} one message per continued literal; empty means OK
 */
export function findStringContinuations(name, text) {
  const failures = [];
  let line = 1;
  let i = 0;
  // The previous significant token on this line and whether it was first.
  let lastToken = null; // "+" | "other" | null (nothing yet on this line)
  let plusFirstOnLine = false;
  let tokensOnLine = 0;
  let pendingTrailingPlus = false; // a `+` ended the previous line

  const newline = () => {
    pendingTrailingPlus = lastToken === "+";
    lastToken = null;
    tokensOnLine = 0;
    plusFirstOnLine = false;
    line++;
  };
  const token = (kind) => {
    if (kind === "+") plusFirstOnLine = tokensOnLine === 0;
    tokensOnLine++;
    lastToken = kind;
  };

  while (i < text.length) {
    const c = text[i];
    if (c === "\n") {
      newline();
      i++;
    } else if (c === " " || c === "\t" || c === "\r") {
      i++;
    } else if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (; i < stop; i++) if (text[i] === "\n") newline();
    } else if (text.startsWith('"""', i)) {
      i += 3;
      while (i < text.length && !text.startsWith('"""', i)) {
        if (text[i] === "\\") i++;
        if (text[i] === "\n") newline();
        i++;
      }
      i += 3;
      token("other");
      pendingTrailingPlus = false;
    } else if (c === '"') {
      const continued =
        (lastToken === "+" && plusFirstOnLine) || (lastToken === null && pendingTrailingPlus);
      if (continued) failures.push(`${name}:${line} string literal continued with "+" across lines`);
      i++;
      while (i < text.length && text[i] !== '"' && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
      i++;
      token("other");
      pendingTrailingPlus = false;
    } else if (c === "'") {
      i++;
      while (i < text.length && text[i] !== "'" && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
      i++;
      token("other");
      pendingTrailingPlus = false;
    } else if (c === "+" && text[i + 1] !== "+" && text[i + 1] !== "=" && text[i - 1] !== "+") {
      token("+");
      i++;
    } else {
      token("other");
      pendingTrailingPlus = false;
      i++;
    }
  }
  return failures;
}

/**
 * @param {string} root repository root to check
 * @returns {string[]} one message per violation in tracked backend Java
 */
export function checkBackendJava(root) {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "backend/*.java"], {
    cwd: root,
    env: ENV_WITHOUT_REPO,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  return tracked.flatMap((file) => {
    try {
      return findStringContinuations(file, readFileSync(resolve(root, file), "utf8"));
    } catch {
      return []; // deleted in the working tree but still in the index
    }
  });
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const failures = checkBackendJava(resolve(SELF_DIR, ".."));
  console.log("Checking that backend Java builds no multiline string by concatenation\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  if (failures.length > 0) {
    console.log('\nUse a text block (""") — backend/README.md. A trailing \\ keeps a line break out of it.');
  }
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
