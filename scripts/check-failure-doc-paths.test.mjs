#!/usr/bin/env node
// Fixture-driven self-test for check-failure-doc-paths.mjs. The real tree
// holds no dead path once the check passes, so without these a checker that
// stopped matching would stay green — the reason check-links.test.mjs exists.

import test from "node:test";
import assert from "node:assert/strict";

import { checkNamedPaths, namedPaths } from "./check-failure-doc-paths.mjs";

const TREE = new Set(["web", "web/Dockerfile", "web/e2e", "scripts", "scripts/a.mjs", "docs", "docs/ci-playbook.md", ".claude", ".claude/rules"]);
const exists = (path) => TREE.has(path);
const check = (text) => checkNamedPaths({ "docs/ci-playbook.md": text }, exists);

test("passes a path that exists, a directory with a trailing slash, and a dotted directory", () => {
  assert.deepEqual(check("Run `scripts/a.mjs`, see `web/` and `.claude/rules/`."), []);
});

test("fails the pre-rename frontend path, with and without an extension", () => {
  const failures = check("`frontend/playwright.config.ts` and `frontend/Dockerfile` and `frontend/`");
  assert.equal(failures.length, 3);
  assert.match(failures[0], /docs\/ci-playbook\.md:1.*frontend\/playwright\.config\.ts/);
});

test("fails a file that moved inside a directory that still exists", () => {
  assert.equal(check("`web/e2e/support/gone.ts` and `web/Missing`").length, 2);
});

test("fails a file path that starts nowhere in the repository", () => {
  assert.equal(check("`lib/api/requestTrace.ts`").length, 1);
});

test("reads a path with a line suffix as the path", () => {
  assert.deepEqual(check("`scripts/a.mjs:42`"), []);
  assert.equal(check("`scripts/gone.mjs:42`").length, 1);
});

test("checks a glob by the directory it starts in", () => {
  assert.deepEqual(check("`scripts/*.test.mjs` and `scripts/check-*.mjs`"), []);
  assert.equal(check("`frontend/*.ts`").length, 1);
});

test("names the line of a path in a later paragraph", () => {
  assert.match(check("one\n\ntwo `frontend/a.ts`")[0], /:3 /);
});

test("ignores what is not a repository path", () => {
  assert.deepEqual(
    check(
      [
        "`GET /api/v1/me` `/cellar` `~/.android/avd` `origin/dev` `next/navigation` `lib/api`",
        "`iteration-10/mobile-e2e-gate` `@kalia/locales/load` `https://a.b/c.ts`",
        "`node_modules/` `maestro-output/android/` `emulator/lib/hardware-properties.ini`",
        "```",
        "frontend/inside-a-fence.ts",
        "```",
      ].join("\n"),
    ),
    [],
  );
});

test("lists the paths a text names", () => {
  assert.deepEqual(
    namedPaths("`scripts/a.mjs` and `web/` and `not a path/with spaces.ts`").map((p) => p.path),
    ["scripts/a.mjs", "web/"],
  );
});
