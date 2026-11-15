# Task 23: Every pull request knows its gates, and a refinement is reviewed for criteria its branch can check

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Two kinds of pull request fall outside the gates:

- **Tasks still close after their implementation merges.** This is a
  regression of a rule that
  [iteration 10 task 20](../iteration-10/20-process-records-match-practice.md)
  settled: every criterion must be checkable before merge
  ([template](../template.md#acceptance-criteria) and both refine skills).
  Iteration 10 task 22 was implemented in #525 and closed by #527, because its
  criterion 4 needed a run its own branch could not produce. Task 07 ticked
  every criterion in #523 but stayed `refined`, and #533 existed only to flip
  its status. Task 22 was refined in #524, which skipped `/code-review`, as
  refinement pull requests routinely do (#464, #477, #478, #503, #504, #516,
  #517, #518, #524, #537). Where review did run on a refinement, it caught this
  class of problem (#474, #476, #540, #548). Neither refine skill has a review
  step.
- **A pull request that completes no task has no defined gates.** #490 (a
  `check-pr-body.mjs` change) and #492 (a test fix) recorded `/code-review` as
  "skipped — reviewed by the product owner", although CLAUDE.md's Roles say
  the product owner does not code. Agent commits on Dependabot pull requests
  (be3d9a8b on #513, 37c6c6d8 on #515) carry no gate record at all.
  `check-pr-body` gates only pull requests that complete a task.

This iteration adds 13 refinements in one pull request, and iterations 12–14
are refined the same way. Maintenance pull requests between iterations are
standalone, with no task file. Both kinds are getting more common.

## Scope

- A refinement pull request is reviewed with `/code-review` for whether each
  criterion can be checked on its own branch.
- The gates for a pull request that completes no task are stated in one place
  and checked where a tool can check them.
- `check-pr-body` fails a pull request that ticks every criterion of a task
  but leaves its `Status` short of `done`.

## Non-goals

- A subagent review on every task before every pull request, which CLAUDE.md
  records as not adopted ([ADR-0027](../../adr/0027-process-weight.md)).
- Changing who refines or who merges.

## Constraints

- **CLAUDE.md stays under 200 lines**, and a bullet there holds only what
  [ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md) allows. The
  gates' full text belongs in a skill.
- **Refinement is batched per iteration**
  ([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). A review
  step must work on one pull request that refines many tasks.
- `scripts/check-pr-body.mjs` has fixtures. A new rule gets one that fails.
- **Only the product owner moves a task to `refined`.** A review step informs
  that decision but does not replace it.
- **Decided at refinement (2026-11-15):**
  - **Both fixes are adopted (SHOULD-118):** both refine skills gain a
    `/code-review` step on the refinement pull request, aimed at whether each
    criterion can be checked on its own branch; and `check-pr-body` fails a
    pull request that ticks every criterion of a task but leaves its
    `Status` short of `done`. Close-out pull requests are not accepted, and
    iteration 10 task 20's decision stands.
  - **A pull request with no task file (COULD-129)** always records
    `make verify-fast`, `/code-review` and the doc-sync statement. An agent's
    commit on a Dependabot pull request records the same gates in a comment
    on that pull request, since the body is Dependabot's.
  - **"Reviewed by the product owner" never stands in for `/code-review`.**
    The product owner does not code (CLAUDE.md's Roles).

## Open questions

**None.**

## Acceptance criteria

- [x] A `check-pr-body` test fails a body for a pull request that ticks every
      criterion while the task file stays `refined`, and passes one that sets
      `done`
- [x] A `check-pr-body` test fails a no-task body missing `make verify-fast`,
      `/code-review` or the doc-sync statement, fails one that records
      "reviewed by the product owner" in place of `/code-review`, and passes
      one that records all three
- [x] Both refine skills state the `/code-review` step, and the gate list for
      a no-task pull request, Dependabot commits included, is stated in one
      place
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-118 and COULD-129,
both `[needs decision]`.
