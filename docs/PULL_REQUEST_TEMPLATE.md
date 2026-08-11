<!--
  Distilled from the conventions that already showed up independently
  across this repository's merged pull requests, not invented fresh.
  GitHub pre-loads this file into the "Open a pull request" text box
  because docs/PULL_REQUEST_TEMPLATE.md is one of its three recognized
  template locations — fill in each section below, delete one that has
  nothing to say (Worth a reviewer's attention is often empty), but keep
  the heading order. Test plan and Doc-sync restate gates that are already
  mandatory per CLAUDE.md's workflow section; this file exists so the
  restating happens the same way every time, not to define the gates.
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
  something dropped as out of scope and where it went instead (a backlog
  entry, a follow-up task). Delete this section entirely rather than
  padding it — nothing unusual to flag means no section, not a restated
  Summary bullet.
-->

## Test plan

<!--
  One line per check: the actual command run (`mvn clean verify`, `npm
  test`, `node scripts/check-tasks.mjs`, ...) and what it showed — not
  just "green," since a suite that never exercised the change proves
  nothing. Say when something was reproduced against the exact invocation
  CI itself uses, not an approximation of it. A manual check against a
  running stack or in a browser is its own line, distinct from an
  automated suite — required for UI changes per CLAUDE.md.
-->

- [ ]

## Doc-sync

<!--
  State which of docs/architecture.md, the ADRs, and the two READMEs were
  checked against this change — updated in this PR, or confirmed accurate
  as is. "Not applicable" is a valid answer (e.g. a dependency bump);
  silence is not, since CLAUDE.md's doc-sync gate requires the check
  happened, whichever way it came out.
-->

<!-- Every PR in this repository is agent-authored (CLAUDE.md's Roles
     section: the product owner does not code), so this line stays as-is. -->
🤖 Generated with [Claude Code](https://claude.com/claude-code)
