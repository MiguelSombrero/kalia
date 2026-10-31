#!/usr/bin/env node
// Fails when backend/openapi.json differs from the copy on a base ref in a way
// an installed app would notice (ADR-0093): a removed, renamed or retyped
// element, an optional field made required, a tightened request. Additive
// changes pass. The comparison is oasdiff's; this wraps it with the two
// things the ADR leaves to the repository, which oasdiff does not have: the
// removal of a deprecated element is an error until a committed waiver names
// the app build that excludes its last user, and a waiver may cover nothing
// else.
//
// oasdiff reports the removal of an element `dev` marks deprecated as
// information; backend/openapi-severity.txt (which oasdiff reads without
// comments) raises it to an error, and backend/openapi-breaking-ignore.txt is
// where a removal is waived.
//
// Usage: node scripts/check-api-breaking.mjs [base-ref]    (default origin/dev)
// Needs `oasdiff` on PATH (CI installs the pinned release; brew install oasdiff).

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "backend/openapi.json";
const SEVERITY = "backend/openapi-severity.txt";
const IGNORE = "backend/openapi-breaking-ignore.txt";

const WAIVABLE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \S+ .+\[api-(path-)?removed-with-deprecation\]$/;
const BUILD_STATED = /^#.*minimum supported build \d+/i;

/**
 * @param {string} text the contents of the waiver file
 * @returns {string[]} one message per entry that may not be there; empty means OK
 */
export function problemsInWaivers(text) {
  const problems = [];
  const lines = text.split("\n").map((line) => line.trim());
  lines.forEach((line, i) => {
    if (line === "" || line.startsWith("#")) return;
    if (!WAIVABLE.test(line)) {
      problems.push(`${IGNORE}:${i + 1}: only the removal of a deprecated element can be waived, not "${line}"`);
    } else if (!BUILD_STATED.test(lines[i - 1] ?? "")) {
      problems.push(
        `${IGNORE}:${i + 1}: the line above must be a comment stating the "minimum supported build N" that excludes the last user`,
      );
    }
  });
  return problems;
}

const main = () => {
  const baseRef = process.argv[2] ?? "origin/dev";

  const problems = problemsInWaivers(readFileSync(resolve(ROOT, IGNORE), "utf8"));
  if (problems.length > 0) {
    console.log(problems.map((p) => `  FAIL  ${p}`).join("\n"));
    process.exit(1);
  }

  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${baseRef}^{commit}`], { cwd: ROOT, stdio: "ignore" });
  } catch {
    console.log(`  FAIL  ${baseRef} is not a ref here, so there is no spec to compare against (fetch it, or pass another base)`);
    process.exit(1);
  }

  let base;
  try {
    base = execFileSync("git", ["show", `${baseRef}:${SPEC}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    console.log(`${baseRef} has no ${SPEC} yet, so there is nothing to compare against.`);
    process.exit(0);
  }

  const dir = mkdtempSync(join(tmpdir(), "kalia-api-breaking-"));
  try {
    const baseFile = join(dir, "base.json");
    writeFileSync(baseFile, base);
    if (!existsSync(resolve(ROOT, SPEC))) {
      console.log(`  FAIL  ${SPEC} is missing`);
      process.exit(1);
    }
    const run = spawnSync(
      "oasdiff",
      ["breaking", baseFile, resolve(ROOT, SPEC), "--severity-levels", resolve(ROOT, SEVERITY), "--err-ignore", resolve(ROOT, IGNORE), "--fail-on", "ERR"],
      { stdio: "inherit" },
    );
    if (run.error) {
      console.log(`  FAIL  could not run oasdiff (${run.error.message}) — brew install oasdiff, or see https://github.com/oasdiff/oasdiff`);
      process.exit(1);
    }
    process.exit(run.status ?? 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
