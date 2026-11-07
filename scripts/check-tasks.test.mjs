#!/usr/bin/env node
// Fixture-driven self-test for check-tasks.mjs's `Kind` rule (ADR-0062). The
// rule can only fire on a task file that is wrong, and the real tree never
// holds one, so without this a checker that stopped enforcing it would stay
// green — the reason check-glossary.test.mjs exists. Runs beside
// `node scripts/check-tasks.mjs` in `make check`, hence CI.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkQualityBacklog, checkRoadmapStatus, checkTasks } from "./check-tasks.mjs";

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

const backlog = ({ mark = "**Highest issued:** MUST-3 · SHOULD-9 · COULD-20", live = "", retired = "" }) =>
  ["# Quality backlog", "", mark, "", "## SHOULD", "", live, "", "## Retired", "", retired, ""].join("\n");

test("passes a backlog whose entries are all at or below the Highest issued line", () => {
  const text = backlog({
    live: "- **SHOULD-9** *(confirmed 2026-11-04)* — open",
    retired: "- ~~SHOULD-9~~ (an earlier half) — lifted\n- ~~COULD-20~~ (x) — lifted",
  });
  assert.deepEqual(checkQualityBacklog(text), []);
});

test("fails an entry numbered above the Highest issued line", () => {
  const failures = checkQualityBacklog(backlog({ live: "- **SHOULD-10** *(confirmed 2026-11-04)* — new" }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /SHOULD-10 is above the "Highest issued" SHOULD-9/);
});

test("fails one ID listed twice as an open finding", () => {
  const failures = checkQualityBacklog(
    backlog({ live: "- **SHOULD-8** *(confirmed 2026-11-04)* — one\n- **SHOULD-8** *(confirmed 2026-11-04)* — two" }),
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0], /SHOULD-8 is listed twice/);
});

test("fails one ID listed twice in Retired", () => {
  const failures = checkQualityBacklog(backlog({ retired: "- ~~COULD-5~~ (a) — lifted\n- ~~COULD-5~~ (b) — lifted" }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /COULD-5 is listed twice in Retired/);
});

test("fails a backlog with no Highest issued line, or one missing a category", () => {
  assert.match(checkQualityBacklog(backlog({ mark: "" }))[0], /exactly one "\*\*Highest issued:\*\*" line, found 0/);
  assert.match(
    checkQualityBacklog(backlog({ mark: "**Highest issued:** MUST-3 · SHOULD-9" }))[0],
    /names no COULD-N/,
  );
});

// docs/roadmap.md is the one place an iteration's status is stated, and these
// fixtures are the only place a roadmap that disagrees with the indexes exists.
function roadmapFixture({ roadmapStatus, taskStatuses }) {
  const root = mkdtempSync(resolve(tmpdir(), "roadmap-check-"));
  mkdirSync(resolve(root, "docs/tasks/iteration-1"), { recursive: true });
  const rows = taskStatuses.map(
    (status, i) => `| [0${i + 1}](iteration-1/0${i + 1}-sample.md) | Sample | ${status} |`,
  );
  writeFileSync(
    resolve(root, "docs/tasks/iteration-1.md"),
    ["# Iteration 1 — Fixture", "", "## Tasks", "", "| ID | Task | Status |", "|---|---|---|", ...rows, ""].join("\n"),
  );
  writeFileSync(
    resolve(root, "docs/roadmap.md"),
    [
      "# Roadmap",
      "",
      "| Iteration | Goal | Status |",
      "|---|---|---|",
      `| [1 — Fixture](tasks/iteration-1.md) | A goal | ${roadmapStatus} |`,
      "",
    ].join("\n"),
  );
  return root;
}

function checkRoadmap(options, assertions) {
  const root = roadmapFixture(options);
  try {
    assertions(checkRoadmapStatus(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("passes a roadmap whose status matches its index", () => {
  checkRoadmap({ roadmapStatus: "⬜ Todo", taskStatuses: ["refined", "refined"] }, (f) => assert.deepEqual(f, []));
  checkRoadmap({ roadmapStatus: "🔄 In progress", taskStatuses: ["done", "refined"] }, (f) => assert.deepEqual(f, []));
  checkRoadmap({ roadmapStatus: "✅ Done", taskStatuses: ["done", "dropped"] }, (f) => assert.deepEqual(f, []));
});

test("fails an iteration with a done task that the roadmap still calls Todo", () => {
  checkRoadmap({ roadmapStatus: "⬜ Todo", taskStatuses: ["done", "refined"] }, (f) => {
    assert.equal(f.length, 1);
    assert.match(f[0], /iteration-1.*Todo.*in progress/i);
  });
});

test("fails an iteration with a task in progress that the roadmap still calls Todo", () => {
  checkRoadmap({ roadmapStatus: "⬜ Todo", taskStatuses: ["in-progress", "refined"] }, (f) => assert.equal(f.length, 1));
});

test("fails an iteration the roadmap calls Done before every task is", () => {
  checkRoadmap({ roadmapStatus: "✅ Done", taskStatuses: ["done", "refined"] }, (f) => {
    assert.equal(f.length, 1);
    assert.match(f[0], /Done.*every task/i);
  });
});

test("fails an iteration whose tasks are all done but the roadmap says in progress", () => {
  checkRoadmap({ roadmapStatus: "🔄 In progress", taskStatuses: ["done", "done"] }, (f) => assert.equal(f.length, 1));
});

test("fails an iteration with task files that has no roadmap row", () => {
  const root = roadmapFixture({ roadmapStatus: "⬜ Todo", taskStatuses: ["refined"] });
  try {
    writeFileSync(resolve(root, "docs/roadmap.md"), "# Roadmap\n\n| Iteration | Goal | Status |\n|---|---|---|\n");
    const f = checkRoadmapStatus(root);
    assert.equal(f.length, 1);
    assert.match(f[0], /no row/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
