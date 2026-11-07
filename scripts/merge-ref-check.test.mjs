#!/usr/bin/env node
// Self-test for the pull_request job that runs `make check` on the merge ref
// (.github/workflows/merge-ref-check.yml). It reproduces the pair that made
// `dev` red (#542 and #543, ADR-0046): two branches that are each fine and
// merge without a conflict, yet fail a checker together. `ci.yml` runs on the
// push, the branch's own head, which never contains the other side.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { checkQualityBacklog } from "./check-tasks.mjs";
import { makeRepo } from "./git-fixture.mjs";

const BACKLOG = "docs/tasks/quality-backlog.md";
const backlog = ({ mark = "", entries = [] }) =>
  ["# Quality backlog", "", mark, "", "## SHOULD", "", ...entries, "", "## Retired", ""].join("\n");

const OLD = ["- **SHOULD-97** *(confirmed 2026-11-01)* — one", "- **SHOULD-98** *(confirmed 2026-11-01)* — two"];

test("two branches that merge cleanly but fail check-tasks together fail on the merge ref only", () => {
  const repo = makeRepo();
  try {
    repo.commit(BACKLOG, backlog({ entries: OLD }), "backlog before either branch");
    repo.git("branch", "pruning");
    repo.git("checkout", "-q", "-b", "filing");
    const entries = [...OLD, "- **SHOULD-99** *(confirmed 2026-11-04)* — filed while the other branch was open"];
    repo.commit(BACKLOG, backlog({ entries }), "file SHOULD-99 (#542)");

    repo.git("checkout", "-q", "pruning");
    const mark = "**Highest issued:** MUST-25 · SHOULD-98 · COULD-107";
    repo.commit(BACKLOG, backlog({ mark, entries: OLD }), "add the Highest issued line (#543)");
    assert.deepEqual(checkQualityBacklog(repo.git("show", `pruning:${BACKLOG}`)), [], "green on its own head");

    repo.mergeRef("pruning", "filing");
    const failures = checkQualityBacklog(readFileSync(resolve(repo.dir, BACKLOG), "utf8"));
    assert.equal(failures.length, 1);
    assert.match(failures[0], /SHOULD-99 is above the "Highest issued" SHOULD-98/);
  } finally {
    repo.remove();
  }
});

test("merge-ref-check.yml runs make check on pull_request, on the merge ref the checkout defaults to", () => {
  const workflow = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../.github/workflows/merge-ref-check.yml"),
    "utf8",
  );
  assert.match(workflow, /^on:\s*\n\s+pull_request:/m);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /run: make check\s*$/m);
  assert.doesNotMatch(workflow, /^\s+ref:/m, "an explicit ref would check the PR head, not the merge");
});
