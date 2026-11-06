#!/usr/bin/env node
// Fails when a workflow pins an Action to a commit SHA its repository does not
// have: a mistyped or invented pin fails only once a job reaches that step in
// CI. Run by `make action-pins`, from `make verify` and CI's Static checks
// job, and not by the pre-push gate, which works offline (ADR-0046).
//
// GitHub answers "does this repository have this commit" with GET
// /repos/{owner}/{repo}/commits/{sha}: 200 when it does, 404 or 422 when not.
// It also answers 200 for a commit that exists only in a fork of the
// repository, which this cannot tell apart. GITHUB_TOKEN, when set, lifts the
// unauthenticated limit of 60 requests an hour.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = ".github/workflows";

const USES = /^\s*(?:-\s+)?uses:\s*["']?([\w.-]+\/[\w.-]+)(?:\/[^@\s"']*)?@([0-9a-f]{40})\b/;

/**
 * @param {string} text a workflow file
 * @returns {{ action: string, sha: string, line: number }[]} each step that pins a repository's Action to a commit SHA
 */
export function pinsIn(text) {
  return text.split("\n").flatMap((line, i) => {
    const match = line.match(USES);
    return match ? [{ action: match[1], sha: match[2], line: i + 1 }] : [];
  });
}

/**
 * @param {string} action owner/repo
 * @param {string} sha
 * @returns {Promise<boolean>} whether GitHub has that commit in that repository
 */
export async function commitExists(action, sha, fetchImpl = fetch, token = process.env.GITHUB_TOKEN) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "kalia-action-pins" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(`https://api.github.com/repos/${action}/commits/${sha}`, { headers });
  if (response.status === 200) return true;
  if (response.status === 404 || response.status === 422) return false;
  throw new Error(`GitHub answered ${response.status} for ${action}@${sha}, so the pin could not be checked`);
}

/**
 * @param {{ file: string, text: string }[]} workflows
 * @param {(action: string, sha: string) => Promise<boolean>} exists asked once per distinct pin
 * @returns {Promise<string[]>} one message per step whose pin does not exist; empty means OK
 */
export async function missingPins(workflows, exists) {
  const pins = workflows.flatMap(({ file, text }) => pinsIn(text).map((pin) => ({ ...pin, file })));
  const answers = new Map();
  for (const { action, sha } of pins) {
    const key = `${action}@${sha}`;
    if (!answers.has(key)) answers.set(key, await exists(action, sha));
  }
  return pins
    .filter(({ action, sha }) => !answers.get(`${action}@${sha}`))
    .map(({ file, line, action, sha }) => `${file}:${line} pins ${action} to ${sha}, a commit that repository does not have`);
}

const main = async () => {
  const workflows = readdirSync(resolve(ROOT, WORKFLOWS))
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((name) => ({ file: `${WORKFLOWS}/${name}`, text: readFileSync(resolve(ROOT, WORKFLOWS, name), "utf8") }));
  console.log(`Checking that every Action pinned in ${WORKFLOWS} is a commit its repository has\n`);
  let problems;
  try {
    problems = await missingPins(workflows, (action, sha) => commitExists(action, sha));
  } catch (error) {
    console.log(`  FAIL  ${error.message}`);
    process.exit(1);
  }
  for (const problem of problems) console.log(`  FAIL  ${problem}`);
  if (problems.length > 0) console.log("\nPin the full SHA of a released tag: git ls-remote https://github.com/<owner>/<repo> <tag>");
  console.log(problems.length === 0 ? "\nOK\n" : `\n${problems.length} failure(s)\n`);
  process.exit(problems.length === 0 ? 0 : 1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
