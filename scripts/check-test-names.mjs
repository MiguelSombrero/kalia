#!/usr/bin/env node
// Fails when a unit-test file in an app is named after no source file beside
// it and carries no suffix its app lists. Each app's CONVENTIONS.md says what a
// suffix is for; this is the check that holds the naming rule. Sibling of the
// other check-*.mjs checkers: plain Node, no dependencies, a fixture self-test
// in check-test-names.test.mjs.
//
// A test is `<stem>.test.<ext>` or `<stem>.<suffix>.test.<ext>`. `<stem>` must
// name a tracked, non-test file in the same directory, ignoring its extension
// (`Sheet.test.tsx` beside `Sheet.tsx`, `index.test.tsx` beside `index.ts`,
// `globals.test.ts` beside `globals.css`). A suffix is accepted only from the
// app's list. A suffix flagged `whole` names a test of several sources at once
// and needs no source: its stem is free, and `in` limits it to one directory.
//
// It reads `git ls-files`, so a staged file counts and an untracked one does
// not. Playwright specs (`*.spec.ts`) and Maestro flows are out of scope.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/** The suffixes each app's CONVENTIONS.md lists: keep the two in step. */
export const APPS = {
  mobile: {
    appearance: {},
    independence: {},
    reduced: {},
    session: {},
    flow: {},
    app: { whole: true, in: "mobile/src/testing" },
  },
  web: {
    accessibility: {},
    backendCalls: {},
    flow: {},
    server: {},
    app: { whole: true },
  },
};

const TEST_FILE = /^(.+)\.test\.(?:[cm]?[jt]sx?)$/;
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|css)$/;
const ANY_TEST_OR_SPEC = /\.(?:test|spec)\./;

// A git hook exports GIT_DIR and its siblings; inherited, they point git at the
// hook's repository instead of `root`.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...ENV_WITHOUT_REPO } = process.env;

/**
 * @param {string} root repository root to check
 * @param {Record<string, Record<string, {whole?: boolean}>>} [apps] app directory to its listed suffixes
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkTestNames(root, apps = APPS) {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, env: ENV_WITHOUT_REPO, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  const sourceStems = new Set(
    tracked
      .filter((file) => SOURCE_FILE.test(basename(file)) && !ANY_TEST_OR_SPEC.test(basename(file)))
      .map((file) => `${dirname(file)}/${basename(file).replace(/\.[^.]+$/, "")}`),
  );

  const failures = [];
  for (const [app, suffixes] of Object.entries(apps)) {
    for (const file of tracked.filter((f) => f.startsWith(`${app}/`))) {
      const match = TEST_FILE.exec(basename(file));
      if (!match) continue;
      const stem = match[1];
      const dir = dirname(file);
      if (sourceStems.has(`${dir}/${stem}`)) continue;

      const dot = stem.lastIndexOf(".");
      const suffix = dot === -1 ? undefined : stem.slice(dot + 1);
      const listed = suffix !== undefined && Object.hasOwn(suffixes, suffix);
      if (listed) {
        const { whole, in: only } = suffixes[suffix];
        if (whole && (only === undefined || dir === only)) continue;
        if (!whole && sourceStems.has(`${dir}/${stem.slice(0, dot)}`)) continue;
      }

      failures.push(
        listed
          ? `${file}: \`.${suffix}\` is a listed suffix, but ${suffixes[suffix].whole ? `only ${suffixes[suffix].in} may hold one` : `no source file named \`${stem.slice(0, dot)}.*\` sits beside it`}`
          : `${file}: names no source file beside it and carries no suffix ${app}/CONVENTIONS.md lists ` +
              `(${Object.keys(suffixes).map((s) => `.${s}`).join(", ")}); rename it after the source it tests`,
      );
    }
  }
  return failures;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const failures = checkTestNames(resolve(SELF_DIR, ".."));
  console.log("Checking that each app's test files are named after a source file or a listed suffix\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
