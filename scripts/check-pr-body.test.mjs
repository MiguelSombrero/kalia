#!/usr/bin/env node
// Self-test for check-pr-body.mjs. The repository's own PRs are not
// available to the check at test time, so fixtures stand in for a body and a
// diff; the template is read for real, since a template whose labels drift
// from GATE_LABELS would make every task-completing PR fail.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { GATE_LABELS, checkPrBody, completesTask, defersWithoutBacklogId, missingVerdicts } from "./check-pr-body.mjs";

const TEMPLATE = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../docs/PULL_REQUEST_TEMPLATE.md"),
  "utf8",
);

const DONE_DIFF = `diff --git a/docs/tasks/iteration-8.5/18-x.md b/docs/tasks/iteration-8.5/18-x.md
--- a/docs/tasks/iteration-8.5/18-x.md
+++ b/docs/tasks/iteration-8.5/18-x.md
-- **Status:** refined
+- **Status:** done
`;

const filled = GATE_LABELS.map((l) => `- **${l}:** ran, green`).join("\n");

test("the shipped template has every label the checker reads, all unfilled", () => {
  assert.deepEqual(missingVerdicts(TEMPLATE), GATE_LABELS);
});

test("an unfilled template fails a task-completing PR on every gate", () => {
  assert.equal(checkPrBody({ body: TEMPLATE, diff: DONE_DIFF }).length, GATE_LABELS.length);
});

test("a body with every verdict passes", () => {
  assert.deepEqual(checkPrBody({ body: `## Gates\n\n${filled}\n`, diff: DONE_DIFF }), []);
});

test("one missing line and one empty line are both named", () => {
  const body = filled
    .split("\n")
    .filter((l) => !l.startsWith("- **Range:**"))
    .map((l) => (l.startsWith("- **Code review:**") ? "- **Code review:** <!-- verdict -->" : l))
    .join("\n");
  assert.deepEqual(missingVerdicts(body), ["Range", "Code review"]);
});

test("a PR that completes no task is not checked", () => {
  const refineDiff = DONE_DIFF.replace("+- **Status:** done", "+- **Status:** refined");
  assert.deepEqual(checkPrBody({ body: "", diff: refineDiff }), []);
  assert.deepEqual(checkPrBody({ body: "", diff: "" }), []);
});

test("a Status: done outside a task file does not count", () => {
  const diff = DONE_DIFF.replaceAll("docs/tasks/iteration-8.5/18-x.md", "docs/other.md");
  assert.equal(completesTask(diff), false);
});

test("a comment that only forms once an inner one is removed does not hide a line", () => {
  const body = filled.replace("- **Range:** ran, green", "- **Range:** <!<!-- x -->-- hidden --> ");
  assert.deepEqual(missingVerdicts(body), ["Range"]);
});

test("an unterminated comment fails closed: the rest of the body counts as comment", () => {
  const body = filled.replace("- **Range:** ran, green", "- **Range:** <!-- never closed");
  assert.deepEqual(missingVerdicts(body), GATE_LABELS.slice(GATE_LABELS.indexOf("Range")));
});

test("a body that defers a finding without a backlog ID fails, task-completing or not", () => {
  for (const body of [
    "- **Code review:** 3 findings. New task: the 429 copy.",
    "Possible follow-up (not done): 415 on body operations.",
    "findings marked *new task* are listed here",
  ]) {
    assert.equal(defersWithoutBacklogId(body), true, body);
    assert.equal(checkPrBody({ body, diff: "" }).length, 1, body);
    assert.equal(checkPrBody({ body: `${filled}\n${body}`, diff: DONE_DIFF }).length, 1, body);
  }
});

test("a deferral that names a quality-backlog ID passes", () => {
  const body = "- **Code review:** 3 findings. New task: the 429 copy, filed as SHOULD-73.";
  assert.deepEqual(checkPrBody({ body, diff: "" }), []);
  assert.deepEqual(checkPrBody({ body: "A follow-up is COULD-95.", diff: "" }), []);
});

test("a body that defers nothing needs no ID", () => {
  assert.deepEqual(checkPrBody({ body: "- **Code review:** 3 findings, all fixed now.", diff: "" }), []);
});

test("an ID elsewhere in the word does not count: only MUST, SHOULD or COULD with a number", () => {
  assert.equal(defersWithoutBacklogId("new task, see ADR-0091 and ISSUE-12 and SHOULD-x"), true);
});

test("the template's own guidance about a new task is a comment and is not read", () => {
  assert.equal(defersWithoutBacklogId(TEMPLATE), false);
});

test("saying nothing was deferred is not a deferral", () => {
  assert.equal(defersWithoutBacklogId("- **Code review:** 3 findings, all fixed now; no new task, no follow-ups."), false);
  assert.equal(defersWithoutBacklogId("There is no new task but a follow-up is left."), true);
});

test("a Dependabot body quoting release notes is not a deferral, a person's body with the same text is", () => {
  const notes = "<li>[lts-active][cd] Move release un-draft to a follow-up job in bot-autonomous</li>";
  assert.deepEqual(checkPrBody({ body: notes, diff: "", author: "dependabot[bot]" }), []);
  assert.equal(checkPrBody({ body: notes, diff: "", author: "MiguelSombrero" }).length, 1);
  assert.equal(checkPrBody({ body: notes, diff: "" }).length, 1);
});

test("a bot exemption covers only the deferral rule, not the gate verdicts", () => {
  const problems = checkPrBody({ body: "", diff: DONE_DIFF, author: "dependabot[bot]" });
  assert.equal(problems.length, GATE_LABELS.length);
});

test("an unterminated comment does not hide a deferral", () => {
  assert.equal(defersWithoutBacklogId("<!-- new task: the 429 copy"), true);
  assert.equal(defersWithoutBacklogId("<!-- guidance: new task --> fine"), false);
});
