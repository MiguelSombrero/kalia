#!/usr/bin/env node
// Decides which of ci.yml's gated jobs a push can affect, and is the one place
// that policy is stated. The workflow's `changes` job runs it and gates each
// job on the output of the same name; `CI passed` counts a skipped job as a
// pass, so a rule here that is too narrow lets a broken change merge with
// nothing red. The tests in ci-changes.test.mjs pin both directions.
//
// What a push is compared against:
// - a branch other than dev or main: the merge base with origin/dev, so the
//   decision covers the whole branch rather than its last commit;
// - dev: the commit before the push (`github.event.before`), so a docs-only
//   merge runs no app suite;
// - main, or no usable base (a first push, a dev push whose previous commit
//   is not an ancestor of the new one after a forced push, a manual dispatch):
//   everything runs.
// A change to ci.yml or to this script also runs everything: they decide every
// job, so no job can be skipped as unaffected by them.
//
// Which jobs a changed path runs, per output:
// - backend and web: their own trees, plus SHARED, the root files both build
//   from or are asserted against.
// - mobile (lint, type check, Jest) compiles mobile/ and the shared packages
//   against the generated client, so it follows those and nothing in SHARED.
// - mobile-e2e drives a release build against the stack's backend, so it also
//   follows backend/ and every file that defines that stack. It never runs on
//   docs/ or web/ alone.
// - keycloak follows the services keycloak-realm-check starts and the scripts
//   it runs.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

export const OUTPUTS = ["backend", "web", "mobile", "mobile-e2e", "keycloak"];

const FILTER_ITSELF = /^(\.github\/workflows\/ci\.yml|scripts\/ci-changes\.mjs)$/;

// docs/architecture.md is asserted against the backend's modules by
// ArchitectureDocumentationTest; .node-version pins the Node every web job
// installs; .dockerignore scopes the web image's build context.
const SHARED =
  /^(docker-compose\.|\.github\/workflows\/|docs\/architecture\.md$|\.node-version$|\.dockerignore$|edge\/|keycloak\/|postgres\/|scripts\/(seed-keycloak-account|keycloak-admin)\.mjs$)/;

const STACK = /^(docker-compose\.|edge\/|keycloak\/|postgres\/|scripts\/(seed-keycloak-account|keycloak-admin)\.mjs$)/;

// backend/openapi.json is what packages/api generates from, so it is a change
// to what the web and the app compile even though it sits in backend/.
const RULES = {
  backend: [SHARED, /^backend\//],
  web: [SHARED, /^(web\/|packages\/|package(-lock)?\.json$|backend\/openapi\.json$)/],
  mobile: [/^(mobile\/|packages\/|package(-lock)?\.json$|backend\/openapi\.json$|Makefile$|scripts\/mobile-env)/],
  "mobile-e2e": [STACK, /^(mobile\/|packages\/|backend\/|package(-lock)?\.json$|Makefile$|scripts\/(mobile-|stack-ports))/],
  keycloak: [
    STACK,
    /^(\.github\/workflows\/|scripts\/(check-keycloak-signin|check-keycloak-realm-config|check-keycloak-pkce-flow)\.mjs$)/,
  ],
};

const DEV = "dev";
const ALWAYS_EVERYTHING = new Set(["main"]);
const NO_COMMIT = /^0+$/;

// A git hook exports GIT_DIR and its siblings; inherited, they point git at the
// hook's repository instead of `cwd`.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

/**
 * @param {string[]} files repository-relative paths the push changed
 * @returns {Record<string, boolean>} one entry per name in OUTPUTS
 */
export function decide(files) {
  const everything = files.some((file) => FILTER_ITSELF.test(file));
  return Object.fromEntries(
    OUTPUTS.map((name) => [name, everything || files.some((file) => RULES[name].some((rule) => rule.test(file)))]),
  );
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, env: ENV_WITHOUT_REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function succeeds(cwd, args) {
  try {
    git(cwd, args);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ cwd: string, refName: string, before?: string, devRef?: string }} push
 * @returns {{ base: string } | { everything: string }}
 */
export function chooseBase({ cwd, refName, before = "", devRef = "origin/dev" }) {
  if (ALWAYS_EVERYTHING.has(refName)) return { everything: `a push to ${refName}` };

  if (refName === DEV) {
    if (!before || NO_COMMIT.test(before)) return { everything: "no previous commit for this push to dev" };
    if (!succeeds(cwd, ["merge-base", "--is-ancestor", before, "HEAD"])) {
      return { everything: `the previous commit ${before} is not an ancestor of this push to dev` };
    }
    return { base: before };
  }

  let base = "";
  try {
    base = git(cwd, ["merge-base", devRef, "HEAD"]);
  } catch {
    base = "";
  }
  if (!base || base === git(cwd, ["rev-parse", "HEAD"])) return { everything: `no usable merge base with ${devRef}` };
  return { base };
}

/**
 * @param {{ cwd: string, refName: string, before?: string, devRef?: string }} push
 * @returns {{ reason: string, files: string[], outputs: Record<string, boolean> }}
 */
export function changes(push) {
  const chosen = chooseBase(push);
  if ("everything" in chosen) {
    const outputs = Object.fromEntries(OUTPUTS.map((name) => [name, true]));
    return { reason: `${chosen.everything}: running everything`, files: [], outputs };
  }
  // --no-renames lists a moved file under both paths: with rename detection a
  // file moved out of mobile/ shows only its new home, and mobile looks untouched.
  const files = git(push.cwd, ["diff", "--name-only", "--no-renames", chosen.base, "HEAD"]).split("\n").filter(Boolean);
  return { reason: `compared with ${chosen.base}`, files, outputs: decide(files) };
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { reason, files, outputs } = changes({
    cwd: resolve(SELF_DIR, ".."),
    refName: process.env.GITHUB_REF_NAME ?? "",
    before: process.env.PUSH_BEFORE ?? "",
  });
  console.log(reason);
  if (files.length > 0) console.log(`Changed files:\n${files.map((f) => `  ${f}`).join("\n")}`);
  const lines = OUTPUTS.map((name) => `${name}=${outputs[name]}`);
  console.log(`Result: ${lines.join(" ")}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}
