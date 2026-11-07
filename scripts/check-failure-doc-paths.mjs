#!/usr/bin/env node
// Fails when docs/ci-playbook.md or docs/common-failures.md names a repository
// path that does not exist. They are the two documents followed when
// something is red, so a path there that has moved (the pre-rename `frontend/`
// was the case) sends a reader to a command that fails a second time. Sibling
// of check-links.mjs, which checks links only; this checks inline code spans.
//
// A span is a repository path when it has no whitespace, contains a `/`, and
// either starts in a directory that exists at the repository root, starts in a
// retired root, or ends in a file extension. Anything else, such as
// `next/navigation`, `origin/dev` or `/api/v1/me`, is a name that happens to
// hold a slash. Fenced blocks are skipped, as in check-links.mjs.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "..");

const DOCUMENTS = ["docs/ci-playbook.md", "docs/common-failures.md"];
// Gone from the repository, so no existence test can recognise a path under
// them as one; naming them is what turns `frontend/a.ts` from prose into a failure.
const RETIRED_ROOTS = ["frontend"];
// Not in a checkout: generated, installed, or on the machine running the check.
const NOT_IN_A_CHECKOUT = ["node_modules/", "maestro-output/", "emulator/"];

/**
 * @param {string} text a Markdown file's contents
 * @returns {{line: number, path: string}[]} each inline code span outside a fence that is path-shaped
 */
export function namedPaths(text) {
  const found = [];
  let fence = false;
  text.split("\n").forEach((raw, index) => {
    if (/^ {0,3}(`{3,}|~{3,})/.test(raw)) {
      fence = !fence;
      return;
    }
    if (fence) return;
    for (const [, span] of raw.matchAll(/`([^`]+)`/g)) {
      const path = span.replace(/:\d+(-\d+)?$/, "");
      if (/\s/.test(path) || !path.includes("/") || /^(\/|~|\$|\.\.?\/)/.test(path)) continue;
      if (!/^[\w.@*/-]+$/.test(path) || NOT_IN_A_CHECKOUT.some((p) => path.startsWith(p))) continue;
      found.push({ line: index + 1, path });
    }
  });
  return found;
}

/**
 * @param {Record<string, string>} files Markdown contents keyed by repository-relative path
 * @param {(path: string) => boolean} exists whether a repository-relative path exists
 * @returns {string[]} one message per dead path; empty means OK
 */
export function checkNamedPaths(files, exists) {
  const failures = [];
  for (const [file, text] of Object.entries(files)) {
    for (const { line, path } of namedPaths(text)) {
      const first = path.split("/")[0];
      const rooted = exists(first) || RETIRED_ROOTS.includes(first);
      if (!rooted && !/\.\w+$/.test(path)) continue;
      const segments = path.split("/");
      const wildcard = segments.findIndex((s) => s.includes("*"));
      const fixed = (wildcard === -1 ? segments : segments.slice(0, wildcard)).join("/");
      if (!exists(fixed.replace(/\/$/, ""))) {
        failures.push(`${file}:${line} names ${path}, which does not exist`);
      }
    }
  }
  return failures;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const files = Object.fromEntries(DOCUMENTS.map((p) => [p, readFileSync(resolve(ROOT, p), "utf8")]));
  const failures = checkNamedPaths(files, (p) => existsSync(resolve(ROOT, p)));
  console.log(`Checking the paths named in ${DOCUMENTS.join(" and ")}\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
