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

import {
  GATE_LABELS,
  checkPrBody,
  completesTask,
  defersWithoutBacklogId,
  mergeRefTasksDiff,
  missingVerdicts,
  noTaskGateProblems,
  ticksEveryCriterionWithoutDone,
  touchesTaskFile,
} from "./check-pr-body.mjs";
import { makeRepo } from "./git-fixture.mjs";

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

// A refinement: a task file touched, no Status set to `done`.
const REFINE_DIFF = DONE_DIFF.replace("+- **Status:** done", "+- **Status:** refined");

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
  assert.deepEqual(checkPrBody({ body: "", diff: REFINE_DIFF }), []);
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
    assert.equal(checkPrBody({ body, diff: REFINE_DIFF }).length, 1, body);
    assert.equal(checkPrBody({ body: `${filled}\n${body}`, diff: DONE_DIFF }).length, 1, body);
  }
});

test("a deferral that names a quality-backlog ID passes", () => {
  const body = "- **Code review:** 3 findings. New task: the 429 copy, filed as SHOULD-73.";
  assert.deepEqual(checkPrBody({ body, diff: REFINE_DIFF }), []);
  assert.deepEqual(checkPrBody({ body: "A follow-up is COULD-95.", diff: REFINE_DIFF }), []);
});

test("a body that defers nothing needs no ID", () => {
  assert.deepEqual(checkPrBody({ body: "- **Code review:** 3 findings, all fixed now.", diff: REFINE_DIFF }), []);
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
  assert.equal(checkPrBody({ body: notes, diff: REFINE_DIFF, author: "MiguelSombrero" }).length, 1);
  assert.equal(checkPrBody({ body: notes, diff: REFINE_DIFF }).length, 1);
});

test("a bot exemption covers only the deferral rule, not the gate verdicts", () => {
  const problems = checkPrBody({ body: "", diff: DONE_DIFF, author: "dependabot[bot]" });
  assert.equal(problems.length, GATE_LABELS.length);
});

test("an unterminated comment does not hide a deferral", () => {
  assert.equal(defersWithoutBacklogId("<!-- new task: the 429 copy"), true);
  assert.equal(defersWithoutBacklogId("<!-- guidance: new task --> fine"), false);
});

const TASK = "docs/tasks/iteration-9/01-x.md";
const taskText = (status) => `# Task 1: x\n\n- **Status:** ${status}\n`;

// `dev` finished a task after the branch point; the branch only touches a doc.
// The merge ref is the branch merged onto that moved `dev`, and
// `pull_request.base.sha` is the branch point.
function movedDev(prChange) {
  const repo = makeRepo();
  repo.commit(TASK, taskText("refined"), "task refined");
  const branchPoint = repo.git("rev-parse", "HEAD");
  repo.git("checkout", "-q", "-b", "pr");
  prChange(repo);
  repo.git("checkout", "-q", "dev");
  repo.commit(TASK, taskText("done"), "dev completes the task");
  repo.mergeRef("dev", "pr");
  return { repo, branchPoint };
}

test("a task another pull request set done on a moved dev is not this PR's", () => {
  const { repo, branchPoint } = movedDev((r) => r.commit("docs/other.md", "x", "docs only"));
  try {
    const stale = repo.git("diff", `${branchPoint}...HEAD`, "--", "docs/tasks");
    assert.equal(completesTask(stale), true, "the base.sha...HEAD diff reads dev's task as this PR's");
    const diff = mergeRefTasksDiff(repo.dir);
    assert.equal(completesTask(diff), false);
    assert.deepEqual(checkPrBody({ body: noTaskBody(), diff }), []);
  } finally {
    repo.remove();
  }
});

test("a task this PR sets done still counts on a moved dev", () => {
  const second = "docs/tasks/iteration-9/02-y.md";
  const { repo } = movedDev((r) => r.commit(second, taskText("done"), "the PR completes its own task"));
  try {
    const diff = mergeRefTasksDiff(repo.dir);
    assert.equal(completesTask(diff), true);
    assert.equal(checkPrBody({ body: "", diff }).length, GATE_LABELS.length);
  } finally {
    repo.remove();
  }
});

test("a checkout that is not a merge commit is refused rather than diffed against its parent", () => {
  const repo = makeRepo();
  repo.commit(TASK, taskText("refined"), "task refined");
  repo.commit(TASK, taskText("done"), "a plain commit");
  try {
    assert.throws(() => mergeRefTasksDiff(repo.dir), /not a merge commit/);
  } finally {
    repo.remove();
  }
});

test("pr-body.yml diffs the merge ref against its first parent, not base.sha", () => {
  const workflow = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../.github/workflows/pr-body.yml"),
    "utf8",
  );
  const job = workflow.slice(workflow.indexOf("gates-section:"), workflow.indexOf("host-paths:"));
  assert.match(job, /check-pr-body\.mjs[^\n]*--merge-ref/);
  assert.doesNotMatch(job, /BASE_SHA/);
  assert.doesNotMatch(job, /^\s+ref:/m, "the checkout must stay on the merge ref");
});

// A new task file as a diff: every line added, which is what a diff that
// carries the whole file as context looks like for a file the PR creates.
function newFileDiff(path, text) {
  const lines = text.replace(/\n$/, "").split("\n");
  return `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join("\n")}\n`;
}

const criteriaText = (status, boxes) =>
  `# Task 1: x\n\n- **Status:** ${status}\n\n## Acceptance criteria\n\n${boxes.map((b) => `- [${b}] a criterion`).join("\n")}\n\n## Notes\n\n- [ ] not a criterion\n`;

test("a task with every criterion ticked and a Status short of done fails, done passes", () => {
  for (const status of ["refined", "in-progress", "needs-refinement"]) {
    const diff = newFileDiff(TASK, criteriaText(status, ["x", "x"]));
    assert.deepEqual(ticksEveryCriterionWithoutDone(diff), [{ path: TASK, status }]);
    const problems = checkPrBody({ body: "", diff });
    assert.equal(problems.length, 1, status);
    assert.match(problems[0], /every acceptance criterion is ticked but Status is "[a-z-]+", not "done"/);
  }
  const done = newFileDiff(TASK, criteriaText("done", ["x", "x"]));
  assert.deepEqual(ticksEveryCriterionWithoutDone(done), []);
  assert.deepEqual(checkPrBody({ body: `## Gates\n\n${filled}\n`, diff: done }), []);
});

test("a task with an unticked criterion, or none, is not flagged", () => {
  assert.deepEqual(ticksEveryCriterionWithoutDone(newFileDiff(TASK, criteriaText("refined", ["x", " "]))), []);
  assert.deepEqual(ticksEveryCriterionWithoutDone(newFileDiff(TASK, criteriaText("refined", []))), []);
});

test("a ticked box outside the Acceptance criteria section does not count", () => {
  const text = `# T\n\n- **Status:** refined\n\n## Acceptance criteria\n\n- [ ] open\n\n## Notes\n\n- [x] done elsewhere\n`;
  assert.deepEqual(ticksEveryCriterionWithoutDone(newFileDiff(TASK, text)), []);
});

test("an implementation PR that ticks the last criterion far from the Status line is read from the merge ref", () => {
  const filler = "\nfiller line\n".repeat(40);
  const before = `# Task 1: x\n\n- **Status:** refined\n${filler}\n## Acceptance criteria\n\n- [x] first\n- [ ] last\n`;
  const repo = makeRepo();
  repo.commit(TASK, before, "task refined");
  repo.git("checkout", "-q", "-b", "pr");
  repo.commit(TASK, before.replace("- [ ] last", "- [x] last"), "tick the last criterion");
  repo.git("checkout", "-q", "dev");
  repo.commit("docs/other.md", "x", "dev moves");
  repo.mergeRef("dev", "pr");
  try {
    const diff = mergeRefTasksDiff(repo.dir);
    assert.deepEqual(ticksEveryCriterionWithoutDone(diff), [{ path: TASK, status: "refined" }]);
    assert.equal(checkPrBody({ body: "", diff }).length, 1);
  } finally {
    repo.remove();
  }
});

test("a deleted task file is read as no file, not as an empty one", () => {
  const diff = `diff --git a/${TASK} b/${TASK}\ndeleted file mode 100644\n--- a/${TASK}\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-# Task 1: x\n-- **Status:** refined\n`;
  assert.deepEqual(ticksEveryCriterionWithoutDone(diff), []);
  assert.equal(touchesTaskFile(diff), true);
});

const noTaskBody = (overrides = {}) =>
  Object.entries({
    "Doc-sync": "README checked, still accurate",
    "Code review": "`/code-review` ran: no findings",
    "Local gate": "`make verify-fast` green",
    ...overrides,
  })
    .filter(([, verdict]) => verdict !== null)
    .map(([label, verdict]) => `- **${label}:** ${verdict}`)
    .join("\n");

test("a PR that touches no task file fails without make verify-fast, /code-review or a doc-sync statement", () => {
  assert.deepEqual(checkPrBody({ body: noTaskBody(), diff: "" }), []);
  assert.deepEqual(checkPrBody({ body: noTaskBody({ "Local gate": "`make verify` green" }), diff: "" }), []);
  for (const [label, verdict] of [
    ["Doc-sync", null],
    ["Doc-sync", "<!-- not yet -->"],
    ["Code review", null],
    ["Code review", "skipped, it is a one-line change"],
    ["Local gate", null],
    ["Local gate", "green"],
  ]) {
    const problems = checkPrBody({ body: noTaskBody({ [label]: verdict }), diff: "" });
    assert.equal(problems.length, 1, `${label}: ${verdict}`);
    assert.match(problems[0], new RegExp(`- \\*\\*${label}:\\*\\*`), `${label}: ${verdict}`);
  }
  assert.equal(checkPrBody({ body: "", diff: "" }).length, 3);
});

test('"reviewed by the product owner" never stands in for /code-review', () => {
  for (const verdict of [
    "skipped, reviewed by the product owner",
    "`/code-review` skipped — reviewed by the product owner",
    "Reviewed by the product owner",
  ]) {
    const problems = checkPrBody({ body: noTaskBody({ "Code review": verdict }), diff: "" });
    assert.equal(problems.length, 1, verdict);
  }
  assert.match(noTaskGateProblems(noTaskBody({ "Code review": "`/code-review` skipped — reviewed by the product owner" }))[0], /never stands in/);
});

test("the no-task gates do not apply to a PR that touches a task file", () => {
  assert.deepEqual(checkPrBody({ body: "", diff: REFINE_DIFF }), []);
  assert.equal(touchesTaskFile(REFINE_DIFF), true);
  assert.equal(touchesTaskFile(newFileDiff("docs/tasks/quality-backlog.md", "# Q\n")), false);
  assert.equal(touchesTaskFile(newFileDiff("docs/tasks/iteration-11.5.md", "# I\n")), false);
});

test("a Dependabot PR's body is exempt from the no-task gates; an agent's commit records them in a comment", () => {
  assert.deepEqual(checkPrBody({ body: "Bumps x from 1 to 2.", diff: "", author: "dependabot[bot]" }), []);
  assert.equal(checkPrBody({ body: "Bumps x from 1 to 2.", diff: "", author: "MiguelSombrero" }).length, 3);
});

test("the shipped template's unfilled Gates section fails a PR that touches no task file on all three gates", () => {
  assert.equal(checkPrBody({ body: TEMPLATE, diff: "" }).length, 3);
});
