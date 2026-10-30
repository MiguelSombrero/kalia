<!--
  Distilled from the conventions that already showed up independently
  across this repository's merged pull requests, not invented fresh.
  GitHub pre-loads this file into the "Open a pull request" text box
  because docs/PULL_REQUEST_TEMPLATE.md is one of its three recognized
  template locations — fill in each section below, delete one that has
  nothing to say (Worth a reviewer's attention is often empty), but keep
  the heading order. Test plan and Gates restate gates that `implement-task`
  and CLAUDE.md's workflow section already make mandatory; this file exists so
  the restating happens the same way every time, not to define the gates.
-->

## Summary

<!--
  What changed, as a short bullet list of outcomes — not a file-by-file
  walkthrough of the diff. If this implements a roadmap task, link its
  task file first, e.g. "Implements [iteration-N task
  NN](../docs/tasks/iteration-N/NN-slug.md)." A PR with no task file (an
  unplanned bug fix, a review follow-up, a process change) says so
  instead of leaving the reader to guess why one is missing.
-->

## Why

<!--
  Optional — fold into Summary when one short paragraph covers both. Give
  this its own heading when the reason needs more room than the change
  itself: a bug's root cause, the quality-backlog entry or ADR that
  prompted this, context a reviewer needs before the diff will make sense.
-->

## Worth a reviewer's attention

<!--
  Optional. The judgment calls, deliberate scope cuts, and near-misses a
  reviewer would otherwise only find by reading the whole diff closely: a
  bug caught during self-review, a tradeoff decided one way over another,
  something dropped as out of scope and where it went instead (a
  quality-backlog entry, by its ID). Delete this section entirely rather than
  padding it — nothing unusual to flag means no section, not a restated
  Summary bullet.
-->

## Test plan

<!--
  One line per check: the actual command run (`make verify-fast`, `make
  verify`, `(cd backend && mvn test)`, `node scripts/check-tasks.mjs`, ...)
  and what it showed — not just "green," since a suite that never exercised
  the change proves nothing. Say when something was reproduced against the
  exact invocation CI itself uses, not an approximation of it. A manual check
  against a running stack or in a browser is its own line, distinct from an
  automated suite (`implement-task` step 10), described in words — never with
  a screenshot.
-->

- [ ]

## Gates

<!--
  The verdict on each gate `implement-task` orders, so the record outlives the
  session that produced it. A gate with no verdict counts as skipped: write
  "skipped — <reason>" rather than leaving a line empty. A task-completing PR
  (one that sets a task file's status to `done`) fails
  `scripts/check-pr-body.mjs` until every line below has a value, and any PR
  fails it that says "new task" or "follow-up" without naming a
  quality-backlog ID. Keep the labels as written — the checker reads them.
-->

- **Range:** <!-- output of `git log --oneline origin/dev..HEAD` -->
- **Doc-sync:** <!-- which of docs/architecture.md, the iteration index and the ADRs were checked against this change: updated here, or confirmed accurate. "Not applicable" is valid (a dependency bump); silence is not -->
- **Code review:** <!-- `/code-review` verdict, each finding marked fix now or new task. A new task is an entry in docs/tasks/quality-backlog.md, filed in this PR; name its ID (SHOULD-N). `scripts/check-pr-body.mjs` fails a body that defers a finding without one -->
- **Local gate:** <!-- `make verify-fast` (or `make verify`, said explicitly), and the required CI checks once they have run -->
- **Running stack:** <!-- what you saw exercising the changed flow, or "nothing user-facing changed" -->
- **Acceptance criteria:** <!-- each criterion's own check re-run, then ticked, status set to `done` -->
- **Iteration Done when:** <!-- re-verified, if this was the iteration's last task; otherwise "not the last task" -->

<!-- Every PR in this repository is agent-authored (CLAUDE.md's Roles
     section: the product owner does not code), so this line stays as-is. -->
🤖 Generated with [Claude Code](https://claude.com/claude-code)
