# Task 21: A failure CI would report is caught before the push

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

[ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md) made
`make verify-fast` the pre-push gate so that CI would stop being the first to
report what a local run could catch. In iteration 10, it still was. Several
failures reached CI after `make verify-fast` had passed on the same commit, and
each one cost a fix commit and another CI round:

- **A check that CI runs in a different setup.** PR 536 added a
  `scripts/*.test.mjs` that imports `sharp`. CI's `Static checks` job runs
  `make check` without `npm ci`, by design, so the test failed there. It passed
  locally, where the checkout has `node_modules`
  ([common-failures](../../common-failures.md), 2026-11-03).
- **CodeQL alerts in repository scripts.** `js/clear-text-logging` fired on
  `scripts/mobile-doctor.mjs` (PR 500) and on `scripts/check-compose.mjs`
  (PR 541), both for printing a value read from the environment or the
  rendered config. `js/incomplete-multi-character-sanitization` fired on
  `mobile/scripts/check-cleartext.mjs` (PR 545). `make verify-fast` runs no
  CodeQL, and no local check looks for either pattern.
- **A gate that runs only in `make verify`.** `make api-breaking` needs
  `oasdiff` and is not part of `make verify-fast`. The new 409 on task 16's
  PR 546 broke it. That session caught it only because it happened to run the
  check, and PR 545's run was a false positive from a branch cut before `dev`
  changed the spec.

A usage report generated on 2026-11-05 also names two kinds of failure this
log does not show: contract and documentation integration tests whose
assertions went stale after a DTO or error-type change, and a GitHub Action
pinned to a version that does not exist. Both are named here as reported, not
as logged.

## Scope

Before a push, the failures above are caught locally where that is cheap
enough to stay in the pre-push gate. Where it is not, the `implement-task`
procedure names the check a change needs before it is pushed. Each check
added is measured against the past failures it would have caught.

## Non-goals

- An agent that fixes failures from inside the git hook. A hook can only
  check; fixing stays in the `implement-task` procedure.
- An always-on agent that watches open pull requests. The desktop app's
  Auto-fix already wakes the session that owns a pull request.
- Running every integration test or the Docker stack before every push. That
  is `make verify`, and ADR-0046 keeps it out of the hook on purpose.
- A second definition of CI's jobs kept by hand. Where local and CI setups
  differ, they share a `make` target, not a copy.

## Constraints

- **ADR-0046:** `make verify-fast` stays the pre-push gate. It needs neither
  Docker nor a build, and is kept fast enough not to be bypassed with
  `--no-verify`, as `scripts/hooks/pre-push` explains. Changing what it runs is
  an amendment of that ADR
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **One home for the check list:** CI and the local gate name `make` targets,
  and `CLAUDE.md` and the skills name the target, never its contents
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- **Root script tests run without `node_modules` in CI** (`Static checks`), and
  that is by design. The fix is to check that, not to install packages there.
- **At most two sessions run heavy work at once** (`CLAUDE.md`). A check that
  needs Docker belongs in `make verify`, not in the gate.
- **No cost:** nothing here may need a paid service or a billed API key.
- A new tool or GitHub Action is a new dependency: asked for, not researched.
- A test that builds throwaway repositories drops the inherited `GIT_*`
  variables, because the pre-push hook exports them
  ([common-failures](../../common-failures.md), 2026-11-01).

## Open questions

1. **Decision home.** Is this an amendment of ADR-0046 (what the pre-push gate
   runs), or a new ADR because it adds a check outside the gate?
2. **CI parity for root script tests.** Which: a check that fails a
   `scripts/*.test.mjs` importing anything but Node built-ins, or running
   `make check` against a copy of the tree without `node_modules`? The first
   is fast; the second is closer to CI.
3. **CodeQL locally.** Should the gate run the CodeQL CLI, if its licence
   allows that here, or grow two targeted checks for the patterns that fired:
   an environment or config value reaching `console.log`, and regex
   sanitization? The CLI is complete but slow; the targeted checks are fast
   but cover only what has already happened.
4. **`make api-breaking`.** Should it move into `make verify-fast`, which makes
   `oasdiff` a prerequisite of every push and blocks a stale branch the way
   PR 545 was blocked? Or should `implement-task` require it whenever
   `backend/openapi.json` changes?
5. **Action pins.** A check that the version a workflow pins exists needs the
   network (`gh api`). Should it run in the gate, and so fail an offline push,
   or only in CI and `make verify`?
6. **Stale contract tests.** Should `implement-task` require running the
   integration tests that assert on a changed DTO, endpoint or error type
   before the push? Should a script list those tests from the changed files,
   or is naming the classes in the procedure enough?
7. **Measuring it.** The replay runs each new check against the commit that
   failed in CI. Which failures count (the Why's list, or more from
   `docs/common-failures.md`), and how many must it catch for the task to be
   worth keeping?
8. **Time budget.** How much slower may `make verify-fast` get? It takes about
   10 s today.

## Acceptance criteria

- [ ] Each check added to the gate has a self-test that fails on a fixture of
      the failure it targets and passes on the corrected case. For example,
      the parity check fails a root script test that imports an npm package
      and passes one that imports only Node built-ins.
- [ ] Against each failing commit agreed at refinement, each check is run on
      the branch, and the PR records, failure by failure, whether it would
      have been caught
- [ ] `make verify-fast`'s run time before and after is recorded in the PR,
      and is within the budget agreed at refinement
- [ ] ADR-0046 is amended, or a new ADR is accepted, stating what runs before
      a push and why, with at least one Bad or Neutral consequence
- [ ] Where a check stays outside the gate, `implement-task` names the change
      that requires it and the `make` target to run
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's request on 2026-11-06, after reading a usage
report's "self-correcting test-first loop before pushing" suggestion. The
evidence is the iteration 10 rows of
[common-failures](../../common-failures.md), and PRs 500, 536, 541, 545 and
546.
