#!/usr/bin/env node
// Reports when backend/openapi.json differs from the copy on a base ref in a
// way an installed app would notice (ADR-0093): a removed, renamed or retyped
// element, an optional field made required, a tightened request. Additive
// changes pass. The comparison is oasdiff's; this wraps it with the two
// things the ADR leaves to the repository, which oasdiff does not have: the
// removal of a deprecated element is an error until a committed waiver names
// the app build that excludes its last user, and a waiver may cover nothing
// else.
//
// ENFORCED below decides what a finding does. Off, the finding is printed as
// advisory and the exit is 0; on, it fails the check. It stays off until the app
// is distributed beyond the product owner's own phone (ADR-0093, amended
// 2026-11-07). A failure to run the check (no oasdiff, an unreadable spec, a
// malformed waiver file) fails in both modes.
//
// oasdiff reports the removal of an element `dev` marks deprecated as
// information; backend/openapi-severity.txt (which oasdiff reads without
// comments) raises it to an error, and backend/openapi-breaking-ignore.txt is
// where a removal is waived.
//
// One finding is let through without a waiver: a new `oneOf` member in the body
// of a 4xx or 5xx response, since a client treats an error body it does not
// recognise as a generic failure. The same finding on a 2xx response still
// fails.
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

/**
 * Whether a breaking finding fails the check. Flip to true when the app is first
 * distributed beyond the product owner's own phone (docs/tasks/backlog.md).
 */
export const ENFORCED = false;

const ERROR_ONE_OF_ADDED = /^response-body-one-of-added$/;
const ERROR_STATUS = /for the response status `[45]\d\d`$/;
const ERR = 3;

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

/**
 * @param {{ id: string, text: string, level: number }[]} findings oasdiff's findings as JSON
 * @returns {{ id: string, text: string, level: number }[]} the findings that fail the check
 */
export function blockingFindings(findings) {
  return findings.filter((f) => f.level >= ERR && !isAllowedErrorOneOf(f));
}

/** @param {{ id: string, text: string }} finding */
export function isAllowedErrorOneOf({ id, text }) {
  return ERROR_ONE_OF_ADDED.test(id) && ERROR_STATUS.test(text);
}

/**
 * @param {string} baseRef the ref the spec is compared against
 * @param {string} cwd the repository to ask
 * @param {Record<string, string | undefined>} env the environment git runs with
 * @returns {boolean} whether baseRef changed the spec after this branch was cut from it
 */
export function baseChangedSpecSinceFork(baseRef, cwd = ROOT, env = process.env) {
  const git = (...args) => spawnSync("git", args, { cwd, env, encoding: "utf8" });
  const mergeBase = git("merge-base", "HEAD", baseRef);
  if (mergeBase.status !== 0) return false;
  return git("diff", "--quiet", mergeBase.stdout.trim(), baseRef, "--", SPEC).status === 1;
}

/** @param {string} baseRef */
export const staleBranchAdvice = (baseRef) =>
  `${baseRef} has changed ${SPEC} since this branch was cut from it, so a finding above may be its change read backwards: ` +
  `merge it in (git merge ${baseRef}) and run the check again`;

/**
 * @param {{ operation: string, path: string, text: string, id: string }[]} blocking the findings that fail the check
 * @param {string} baseRef
 * @param {() => boolean} baseChanged whether baseRef changed the spec after this branch was cut, asked only on a failure
 * @returns {string[]} the lines the check prints for them
 */
export function failureReport(blocking, baseRef, baseChanged) {
  const lines = blocking.map((f) => `  FAIL  ${f.operation} ${f.path} ${f.text} [${f.id}]`);
  if (blocking.length > 0 && baseChanged()) lines.push("", staleBranchAdvice(baseRef));
  return lines;
}

/** @param {string} text escaped as GitHub's workflow commands require */
const escapeCommand = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

/**
 * @param {{ operation: string, path: string, text: string, id: string }[]} blocking the findings that break the contract
 * @param {string} baseRef
 * @param {() => boolean} baseChanged whether baseRef changed the spec after this branch was cut, asked only on a finding
 * @param {{ enforced?: boolean, annotate?: boolean }} mode annotate adds a GitHub warning annotation per advisory finding
 * @returns {{ lines: string[], exitCode: number }} what the check prints and how it exits
 */
export function breakingReport(blocking, baseRef, baseChanged, { enforced = ENFORCED, annotate = false } = {}) {
  if (enforced) return { lines: failureReport(blocking, baseRef, baseChanged), exitCode: blocking.length === 0 ? 0 : 1 };
  if (blocking.length === 0) return { lines: [], exitCode: 0 };
  const lines = blocking.flatMap((f) => {
    const finding = `${f.operation} ${f.path} ${f.text} [${f.id}]`;
    return annotate ? [`  WARN  ${finding}`, `::warning title=API breaking change (advisory)::${escapeCommand(finding)}`] : [`  WARN  ${finding}`];
  });
  lines.push(
    "",
    `  advisory: ${blocking.length} breaking finding${blocking.length === 1 ? "" : "s"} did not fail the check; ` +
      "ENFORCED in scripts/check-api-breaking.mjs is off until the app is distributed beyond the product owner's own phone (ADR-0093)",
  );
  if (baseChanged()) lines.push("", staleBranchAdvice(baseRef));
  return { lines, exitCode: 0 };
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
      ["breaking", baseFile, resolve(ROOT, SPEC), "--severity-levels", resolve(ROOT, SEVERITY), "--err-ignore", resolve(ROOT, IGNORE), "--format", "json"],
      { encoding: "utf8" },
    );
    if (run.error || run.status !== 0) {
      const why = run.error?.message ?? run.stderr;
      console.log(`  FAIL  could not run oasdiff (${why}) — brew install oasdiff, or see https://github.com/oasdiff/oasdiff`);
      process.exit(1);
    }
    const findings = JSON.parse(run.stdout || "[]");
    for (const f of findings.filter(isAllowedErrorOneOf)) {
      console.log(`  ok    ${f.operation} ${f.path} ${f.text} [${f.id}] (an error body may gain a member)`);
    }
    const blocking = blockingFindings(findings);
    const { lines, exitCode } = breakingReport(blocking, baseRef, () => baseChangedSpecSinceFork(baseRef), {
      annotate: process.env.GITHUB_ACTIONS === "true",
    });
    for (const line of lines) console.log(line);
    process.exit(exitCode);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
