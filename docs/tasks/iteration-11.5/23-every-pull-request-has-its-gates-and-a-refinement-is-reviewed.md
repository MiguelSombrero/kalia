# Task 23: Every pull request knows its gates, and a refinement is reviewed for criteria its branch can check

- **Status:** needs-refinement
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

- A refinement's criteria are reviewed for whether each can be checked on its
  own branch before the task is marked `refined`, in the way refinement
  chooses.
- The gates for a pull request that completes no task are stated in one place
  and checked where a tool can check them.
- `check-pr-body` fails a pull request that ticks every criterion of a task
  but leaves its `Status` short of `done`, if refinement adopts this.

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

## Open questions

- **Functional scope.** Choose any of (SHOULD-118, `[needs decision]`):
  - add a review step to both refine skills, aimed at whether each criterion
    can be checked on its own branch;
  - have `check-pr-body` fail a pull request that ticks every criterion of a
    task but leaves its `Status` short of `done` (this would have caught
    #523);
  - accept close-out pull requests, and amend iteration 10 task 20's decision.
- **Functional scope.** Which gates apply to a pull request with no task file
  (COULD-129, `[needs decision]`)? `make verify-fast` and `/code-review`
  always? The doc-sync statement? What about an agent's commit on a
  Dependabot pull request?
- **Completion signals.** Does "reviewed by the product owner" ever stand in
  for `/code-review`, and if so, for which kinds of change?

## Acceptance criteria

- [ ] If refinement adopts the status rule, a `check-pr-body` test fails a
      body for a pull request that ticks every criterion while the task file
      stays `refined`, and passes one that sets `done`
- [ ] If refinement adopts the no-task gates, a `check-pr-body` test fails a
      no-task body missing a required gate and passes one that records it
- [ ] Each refine skill states the review step refinement chooses, or the
      pull request records the decision to accept close-outs and amends
      iteration 10 task 20
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-118 and COULD-129,
both `[needs decision]`.
