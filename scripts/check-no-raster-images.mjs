#!/usr/bin/env node
// Fails when git tracks a raster image outside ALLOWED_DIRS. It exists because
// a screenshot committed from the product owner's machine publishes whatever it
// shows and cannot be taken back (ADR-0062, and the CLAUDE.md rule it backs);
// a rule written in prose alone is what ADR-0039 says agents break. Sibling of
// the other check-*.mjs checkers: plain Node, no dependencies, and a fixture
// self-test in check-no-raster-images.test.mjs.
//
// It reads `git ls-files`, so a staged file counts and an untracked or ignored
// one does not. Only what a commit would publish is the concern. Vector images
// are out of scope: a screenshot is never one.
//
// A name-based check cannot tell a capture from a logo, so the line is drawn by
// where a file lives rather than what it is. No directory is allowed today.
// A task that ships a raster asset (iteration 7.5 task 04) adds its directory
// to ALLOWED_DIRS, which puts the decision in the diff where review sees it.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const ALLOWED_DIRS = [];

const RASTER = /\.(png|jpe?g|gif|webp|heic|heif|avif|bmp|tiff?)$/i;

// A git hook exports GIT_DIR and its siblings, and `make verify-fast` runs
// this from the pre-push hook. Inherited, they point git at the hook's
// repository instead of `root`, which is wrong for a fixture and fatal for a
// checkout git considers bare.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

/**
 * @param {string} root repository root to check
 * @param {string[]} [allowedDirs] repository-relative directories that may hold raster images
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkRasterImages(root, allowedDirs = ALLOWED_DIRS) {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, env: ENV_WITHOUT_REPO, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  const inAllowedDir = (file) => allowedDirs.some((dir) => file.startsWith(`${dir.replace(/\/$/, "")}/`));

  return tracked
    .filter((file) => RASTER.test(file) && !inAllowedDir(file))
    .map(
      (file) =>
        `${file} is a raster image tracked by git. Screenshots are never committed (CLAUDE.md, ADR-0062); ` +
        `if this is an asset the project ships, add its directory to ALLOWED_DIRS in scripts/check-no-raster-images.mjs`,
    );
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const failures = checkRasterImages(resolve(SELF_DIR, ".."));
  console.log("Checking that git tracks no raster image\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
