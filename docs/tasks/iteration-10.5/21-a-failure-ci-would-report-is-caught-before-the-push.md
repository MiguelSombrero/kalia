# Task 21: A failure CI would report is caught before the push

- **Status:** refined
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

**Decided at refinement, 2026-11-06** (product owner):

- **ADR-0046 is amended**, not replaced. It already owns what the pre-push
  gate runs and why. A new ADR was rejected.
- **CI parity for root script tests is an import check** in `make check`. It
  fails a `scripts/*.test.mjs`, or a script one loads, that imports anything
  but a Node built-in or a repository file, and names the line. Running
  `make check` against a copy of the tree without `node_modules` was rejected
  as slower for the same catch.
- **CodeQL's two patterns get targeted checks in the gate:** a value read
  from `process.env` or from rendered configuration reaching console output,
  and stripping comments or markup with a regex. The CodeQL CLI is not
  adopted, so no new dependency is added. Leaving CodeQL to CI alone was
  rejected.
- **`make api-breaking` joins `make verify-fast`,** so `oasdiff` becomes a
  prerequisite of every push. When a branch was cut before `dev` changed the
  spec (PR 545), the failure says to merge `dev` in. Requiring it from
  `implement-task` instead was rejected, because remembering to run it is what
  failed before.
  - *Derived:* the target's fetch of `origin/dev` only warns when it fails,
    so an offline push still runs the check, against the last fetched `dev`.
  - *Derived:* the README lists `oasdiff` as a prerequisite of
    `make verify-fast`. The version stays where ADR-0093 records it.
- **The Action-pin check runs in `make verify` and CI, not in the gate,** so
  an offline push still works. It fails a workflow that pins an Action to a
  commit SHA that does not exist. Putting it in the gate, or not adopting it,
  was rejected.
- **Stale contract tests are named in `implement-task`,** not mapped by a
  script. The procedure names the changes that need them (a DTO, an endpoint,
  an error type, `backend/openapi.json`) and the Maven command that runs the
  documentation integration tests before the push. They need Docker, so they
  stay out of the gate.
- **The replay uses the Why's list:** PR 536 (the `sharp` import), PRs 500 and
  541 (clear-text logging), PR 545 (regex sanitization) and PR 546
  (`api-breaking`). Each check must catch every failure it targets, and a miss
  is reported with its cause. A wider set held to a majority was rejected.
- **The new checks may add at most 10 s** to `make verify-fast`, measured
  before and after on the same machine. It measured about 42 s on the product
  owner's Mac on 2026-11-06, against the ~10 s that `CLAUDE.md` states.
  **`CLAUDE.md`'s figure is corrected** to the measured one.
  - *Derived:* `README.md` states the same figure and is corrected with it.

## Open questions

**None.**

## Acceptance criteria

- [ ] The import check's self-test fails a root script test that imports an
      npm package, and passes one that imports only Node built-ins and
      repository files
- [ ] Each targeted check's self-test fails a fixture of its pattern (an
      environment or configuration value logged; a regex that strips
      comments or markup), and passes the corrected form
- [ ] `make verify-fast` runs `make api-breaking`, and a test shows that its
      failure on a branch cut before `dev` changed the spec says to merge
      `dev` in
- [ ] A test, with the GitHub call stubbed, shows the Action-pin check fails
      a workflow that pins a SHA that does not exist, and `make verify` and
      CI run it
- [ ] Each check is run on the branch against the failing commit of PRs 536,
      500, 541, 545 and 546, and the PR records each result. Every failure a
      check targets is caught, or the miss is reported with its cause
- [ ] `make verify-fast`'s run time before and after, on the same machine, is
      recorded in the PR and grows by at most 10 s. `CLAUDE.md` and
      `README.md` state the measured figure
- [ ] ADR-0046 is amended to say what runs before a push and why, with at
      least one Bad or Neutral consequence
- [ ] `implement-task` names the changes that need the documentation
      integration tests and the Maven command that runs them before the push
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's request on 2026-11-06, after reading a usage
report's "self-correcting test-first loop before pushing" suggestion. The
evidence is the iteration 10 rows of
[common-failures](../../common-failures.md), and PRs 500, 536, 541, 545 and
546.
