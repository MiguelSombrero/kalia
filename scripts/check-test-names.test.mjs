#!/usr/bin/env node
// Fixture-driven self-test for check-test-names.mjs. The real tree conforms, so
// the check never fires there and would stay green if it stopped looking. Each
// fixture is a throwaway git repository, because the check reads what git
// tracks.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { APPS, checkTestNames } from "./check-test-names.mjs";

const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

function check(tracked, assertions, untracked = []) {
  const root = mkdtempSync(resolve(tmpdir(), "test-names-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root, env: cleanEnv });
    for (const rel of [...tracked, ...untracked]) {
      mkdirSync(resolve(root, dirname(rel)), { recursive: true });
      writeFileSync(resolve(root, rel), "x");
    }
    execFileSync("git", ["add", ...tracked], { cwd: root, env: cleanEnv });
    assertions(checkTestNames(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a test named after no source file and carrying no suffix fails, naming the file", () => {
  check(["mobile/src/states.test.tsx", "mobile/src/Sheet.tsx"], (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /mobile\/src\/states\.test\.tsx/);
    assert.match(failures[0], /mobile\/CONVENTIONS\.md/);
  });
});

test("a test beside the source file it is named after passes, whatever the extensions", () => {
  check(
    [
      "mobile/src/Sheet.tsx",
      "mobile/src/Sheet.test.tsx",
      "mobile/src/lib/model.ts",
      "mobile/src/lib/model.test.ts",
      "web/app/globals.css",
      "web/app/globals.test.ts",
      "web/lib/index.ts",
      "web/lib/index.test.ts",
      "mobile/app.config.js",
      "mobile/app.config.test.mjs",
    ],
    (failures) => assert.deepEqual(failures, []),
  );
});

test("a listed suffix on a name that has a source passes, one of each listed kind", () => {
  for (const [app, suffixes] of Object.entries(APPS)) {
    const tracked = [`${app}/src/Screen.tsx`];
    for (const [suffix, { whole }] of Object.entries(suffixes)) {
      if (!whole) tracked.push(`${app}/src/Screen.${suffix}.test.tsx`);
      else tracked.push(`${app}/src/testing/Screen.${suffix}.test.tsx`);
    }
    check(tracked, (failures) => assert.deepEqual(failures, []));
  }
});

test("a suffix that is not listed fails, even on a name that has a source", () => {
  check(["mobile/src/Screen.tsx", "mobile/src/Screen.whatever.test.tsx"], (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Screen\.whatever\.test\.tsx/);
  });
});

test("a suffix is read per app: web's `backendCalls` is not mobile's", () => {
  check(["mobile/src/Screen.tsx", "mobile/src/Screen.backendCalls.test.tsx"], (failures) =>
    assert.equal(failures.length, 1),
  );
  check(["web/src/page.tsx", "web/src/page.backendCalls.test.tsx"], (failures) => assert.deepEqual(failures, []));
});

test("a listed suffix with no source behind it fails", () => {
  check(["mobile/src/Screen.reduced.test.tsx"], (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no source file named `Screen\.\*`/);
  });
});

test("a whole-app suffix needs no source, and its stem is free", () => {
  check(["mobile/src/testing/routes.app.test.tsx"], (failures) => assert.deepEqual(failures, []));
});

test("a directory-limited whole-app suffix fails elsewhere", () => {
  check(["mobile/src/lib/routes.app.test.tsx"], (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /only mobile\/src\/testing may hold one/);
  });
});

test("a data file beside a test is not a source", () => {
  check(["mobile/src/states.json", "mobile/src/states.test.tsx"], (failures) => assert.equal(failures.length, 1));
});

test("each app's CONVENTIONS.md lists every suffix the check accepts", () => {
  for (const [app, suffixes] of Object.entries(APPS)) {
    const doc = readFileSync(resolve(import.meta.dirname, "..", app, "CONVENTIONS.md"), "utf8");
    for (const suffix of Object.keys(suffixes)) assert.ok(doc.includes(`| \`.${suffix}\` |`), `${app}: .${suffix}`);
  }
});

test("a source file in another directory does not count", () => {
  check(["mobile/src/a/Sheet.tsx", "mobile/src/b/Sheet.test.tsx"], (failures) => assert.equal(failures.length, 1));
});

test("a test file is not a source: a stray test beside another does not vouch for it", () => {
  check(["mobile/src/Sheet.test.tsx", "mobile/src/Sheet.reduced.test.tsx"], (failures) =>
    assert.equal(failures.length, 2),
  );
});

test("a file outside the apps, a Playwright spec and an untracked test are not checked", () => {
  check(
    ["scripts/states.test.mjs", "web/e2e/shell.spec.ts", "web/e2e/support/keyboard.spec.ts"],
    (failures) => assert.deepEqual(failures, []),
    ["mobile/src/untracked.test.tsx"],
  );
});
