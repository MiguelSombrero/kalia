# Task 17: `dev` stays green after a merge, and a red `dev` is logged

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

Pull requests merge without CI having run against the current `dev`: the
branch ruleset has `strict_required_status_checks_policy: false`. #447 removed
`/api/v1/me`, #448 added a spec calling it, both were green on their own, and
`dev` went red (run 40359579236). Two sessions then wrote the same fix, c559c86
in #450 and 71ed660 in #451.

When `dev` is red after a merge, nobody logs it either.
[ADR-0084](../../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)
logs a failure "on the branch you are working on", and a post-merge run has no
session working on it. Runs 40077060971, 40166251873 and 40168778643 have no
row, so the log the sweep counts misses exactly the failures that hit
everyone.

Iteration 9 adds a third codebase and parallel sessions working across it,
which makes both problems more frequent.

## Scope

A pull request cannot merge on CI results that `dev` has since overtaken, and
a red run on `dev` reaches `docs/common-failures.md` without depending on
someone happening to notice it.

## Constraints

- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): the
  required CI checks are the Docker gate.
- [ADR-0084](../../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)
  is amended, not contradicted, if who logs a `dev` failure changes.
- Merging stays the product owner's explicit action (`CLAUDE.md`), so a merge
  queue cannot merge on an agent's behalf.
- Changing the repository's branch ruleset is a settings change only the
  product owner makes.

## Open questions

1. **Which guard for merges?** Require branches to be up to date (every
   merge after another needs a rebase and a fresh CI run), a merge queue, or
   only a playbook entry for "red on fresh `dev`, green on its PR".
2. **Who logs a red `dev`?** The `worktree` skill's start step checking
   `dev`'s recent runs, the sweep reconstructing them from history, or a
   scheduled workflow opening an issue.
3. **Is extra CI time acceptable?** Up-to-date branches cost one rerun per
   queued PR. The mobile end-to-end job makes each run longer.

## Acceptance criteria

- [ ] Two PRs that are each green, but conflict in behaviour, can no longer
      both merge without one being tested on top of the other, verified with
      a pair of test branches or by stating the ruleset change and its effect
- [ ] A red run on `dev` reaches `docs/common-failures.md` by the route
      refinement chose, and the ADR-0084 text says so
- [ ] The three unlogged runs named above have rows
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-89 and SHOULD-88,
both `[needs decision]`. The decisions are open questions 1 and 2.
