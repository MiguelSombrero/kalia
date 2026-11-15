#!/usr/bin/env node
// Fixture-driven self-test for check-common-failures.mjs. The real log passes
// once its rows are classified, so without these a checker that stopped
// looking would stay green — the reason check-links.test.mjs exists.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { causeProblem, checkLogRows } from "./check-common-failures.mjs";

const HEADER = "| Date | Where | Signature | Why | Cause |\n|---|---|---|---|---|\n";
const log = (...rows) => HEADER + rows.join("\n") + "\n";
const row = (cause) => `| 2026-11-01 | CI \`X\` | \`sig\` | why | ${cause} |`;

test("fails a defect left unfixed with no owner, and a deferral that only says so", () => {
  assert.equal(checkLogRows(log(row("defect"))).length, 1);
  assert.equal(checkLogRows(log(row("defect, not fixed here"))).length, 1);
  assert.equal(checkLogRows(log(row("defect, open"))).length, 1);
});

test("passes an external row for a registry outage with no owner", () => {
  assert.deepEqual(checkLogRows(log(row("external"))), []);
  assert.deepEqual(checkLogRows(log(row("external, quay.io returned 503"))), []);
});

test("fails a row with no cause kind: a missing column, an empty cell, an unknown word", () => {
  const fourColumns = "| 2026-11-01 | CI | `sig` | why |";
  assert.equal(checkLogRows(log(fourColumns)).length, 1);
  assert.equal(checkLogRows(log(row(""))).length, 1);
  assert.equal(checkLogRows(log(row("flaky"))).length, 1);
});

test("passes a defect marked fixed, or owned by a backlog ID, a task or a playbook entry", () => {
  for (const cause of [
    "defect, fixed",
    "defect, fixed in `scripts/a.mjs`",
    "defect, SHOULD-101",
    "defect, [task 22](tasks/iteration-11.5/22-x.md)",
    "defect, task 19",
    "defect, [ci-playbook](ci-playbook.md#mobile-e2e-maestro-android)",
  ]) {
    assert.deepEqual(checkLogRows(log(row(cause))), [], cause);
  }
});

test("reads a cause kind by its word, not by a prefix", () => {
  assert.equal(checkLogRows(log(row("externalised"))).length, 1);
  assert.equal(checkLogRows(log(row("defective, fixed"))).length, 1);
  assert.match(causeProblem("flaky") ?? "", /external.*defect/);
});

test("keeps an escaped pipe inside its cell", () => {
  assert.deepEqual(checkLogRows(log("| 2026-11-01 | CI | `a\\|b` | why | external |")), []);
});

test("names the failing row's line and date", () => {
  const [failure] = checkLogRows(log(row("external"), row("defect")));
  assert.match(failure, /^line 4 \(2026-11-01\)/);
});

test("fails a table whose header is not the five columns", () => {
  const old = "| Date | Where | Signature | Why |\n|---|---|---|---|\n";
  assert.equal(checkLogRows(old + "| 2026-11-01 | CI | `s` | w |\n").length >= 1, true);
  assert.deepEqual(checkLogRows("no table here\n"), ["no table whose header starts with Date"]);
});

test("ignores prose outside the table", () => {
  assert.deepEqual(checkLogRows("# Common failures\n\n- a bullet\n\n" + log(row("external"))), []);
});

test("every row of the real log has a cause", () => {
  const real = readFileSync(new URL("../docs/common-failures.md", import.meta.url), "utf8");
  assert.deepEqual(checkLogRows(real), []);
});
