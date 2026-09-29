#!/usr/bin/env node
// Fixture-driven self-test for check-tasks.mjs's `Kind` rule (iteration 7.5
// task 01). The rule can only fire on a task file that is wrong, and the real
// tree never holds one, so without this a checker that stopped enforcing it
// would stay green — the reason check-glossary.test.mjs exists. Runs in CI
// beside `node scripts/check-tasks.mjs` and in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkTasks } from "./check-tasks.mjs";

const TEST_CRITERION = "- [ ] `npm test` covers the new behaviour\n";
const ALTERNATIVES_CRITERION =
  "- [ ] The product owner chose from built alternatives rather than from descriptions\n";

function fixture({ kindLine = "", criteria }) {
  const root = mkdtempSync(resolve(tmpdir(), "tasks-check-"));
  mkdirSync(resolve(root, "docs/tasks/iteration-1"), { recursive: true });
  writeFileSync(
    resolve(root, "docs/tasks/iteration-1.md"),
    [
      "# Iteration 1 — Fixture",
      "",
      "## Done when",
      "",
      "Something runnable.",
      "",
      "## Tasks",
      "",
      "| ID | Task | Status |",
      "|---|---|---|",
      "| [01](iteration-1/01-sample.md) | Sample | refined |",
      "",
    ].join("\n"),
  );
  writeFileSync(
    resolve(root, "docs/tasks/iteration-1/01-sample.md"),
    [
      "# Task 01: Sample",
      "",
      "- **Status:** refined",
      "- **Iteration:** [1](../iteration-1.md)",
      kindLine,
      "",
      "## Why",
      "",
      "A reason.",
      "",
      "## Scope",
      "",
      "A scope.",
      "",
      "## Constraints",
      "",
      "**None.**",
      "",
      "## Open questions",
      "",
      "**None.**",
      "",
      "## Acceptance criteria",
      "",
      criteria,
    ].join("\n"),
  );
  return root;
}

function check(options, assertions) {
  const root = fixture(options);
  try {
    assertions(checkTasks(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("passes an ordinary task with no Kind line", () => {
  check({ criteria: TEST_CRITERION }, (failures) => assert.deepEqual(failures, []));
});

test("passes a design task that names built alternatives", () => {
  check(
    { kindLine: "- **Kind:** design", criteria: ALTERNATIVES_CRITERION + TEST_CRITERION },
    (failures) => assert.deepEqual(failures, []),
  );
});

test("fails a design task with no criterion about built alternatives", () => {
  check({ kindLine: "- **Kind:** design", criteria: TEST_CRITERION }, (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Kind is "design".*built alternatives/);
  });
});

test("fails a design task whose 'built' and 'alternatives' sit in different criteria", () => {
  check(
    {
      kindLine: "- **Kind:** design",
      criteria:
        "- [ ] The component is built with `npm test` coverage\n" +
        "- [ ] Alternatives were discussed\n",
    },
    (failures) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /built alternatives/);
    },
  );
});

test("fails an unknown Kind value", () => {
  check({ kindLine: "- **Kind:** bespoke", criteria: TEST_CRITERION }, (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Kind "bespoke" is not one of: design/);
  });
});
