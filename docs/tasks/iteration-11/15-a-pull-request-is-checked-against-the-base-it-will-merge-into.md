# Task 15: A pull request is checked against the base it will merge into

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

Two checks read a pull request against a `dev` that has moved.

- **`check-pr-body`** (SHOULD-117) fails pull requests that complete no task,
  because `.github/workflows/pr-body.yml` diffs `"$BASE_SHA"...HEAD`: `HEAD` is
  the merge ref, built on the current `dev`, and `pull_request.base.sha` lags
  it, so every task set `done` on `dev` in between reads as completed by this
  PR. Dependabot PRs 513 and 515 failed all seven gate lines this way, and 515
  merged with the check red, since the workflow sits outside `ci-passed`.
- **The merge race** (SHOULD-115). [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md)
  accepted that two branches, each green alone, can break `dev` together, and
  said the up-to-date requirement "reopens when the failure log shows the race a
  second time". It happened a second time: #542 filed SHOULD-99 to COULD-114,
  #543, branched before it merged, added the **Highest issued** line from a
  backlog without them, each was green on its own head, and `dev` went red on
  `check-tasks` (run 41827668769) until an unrelated branch fixed it, while every
  worktree cut from `dev` failed `verify-fast`. Nothing reopened the ADR.

Iteration 11 runs several sessions across docs, scripts and the quality backlog,
which is the shape that produces both.

## Scope

`check-pr-body` compares the pull request with the base it will merge into, and
is covered by a test that has a moved `dev`. The merge race is settled one of
three ways, per the open question, and ADR-0046 says which.

## Non-goals

- Which gates apply to a PR that completes no task, and a review step in the
  refine skills — a separate decision, left in the quality backlog.
- Changing the vulnerability scan or the Docker gate.

## Constraints

- The required checks cost no money and no new account
  ([`CLAUDE.md`](../../../CLAUDE.md)); a `pull_request`-triggered job runs on
  the minutes already free.
- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- `scripts/check-pr-body.mjs` is the one place the body's rules live
  ([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md)).

## Open questions

- **Constraints and trade-offs.** For the race, SHOULD-115's options: turn the
  strict up-to-date requirement back on (every merge waits for a rebase); add a
  required `pull_request` job running only `make check` (about a second) on the
  merge ref, which would have failed #543; or accept the race and amend the ADR
  with the second occurrence.
- **Functional scope.** Whether `pr-body.yml` joins the checks `ci-passed`
  requires, so that a red body check cannot merge.

## Acceptance criteria

- [ ] A test builds a repository in which `dev` has moved a task to `done` after
      the branch point and shows `check-pr-body` no longer counting that task as
      this PR's; it failed against the `"$BASE_SHA"...HEAD` diff
- [ ] The workflow diffs the merge ref against its first parent
- [ ] The chosen answer to the merge race is in place — a required job that
      fails on the #542/#543 pair reproduced in a fixture, or the stricter
      requirement, or the ADR amended — and ADR-0046 names the second
      occurrence
- [ ] `docs/common-failures.md` records the false positives and the race with
      their cause
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-115 (`[needs
decision]`, the first open question) and SHOULD-117.
