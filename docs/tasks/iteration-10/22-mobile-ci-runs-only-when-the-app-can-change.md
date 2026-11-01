# Task 22: The Android end-to-end job runs only when the app or its stack can change

- **Status:** done
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

`Mobile E2E (Maestro, Android)` is required and takes 13–19 minutes (median 17
over 19 green runs), and it fails for reasons that have nothing to do with the
change in front of it. Two things in the `changes` job of `ci.yml` run it far
more often than the app can be affected:

- **A shared-file rule turns on everything.** The `shared` pattern lists files
  that "either suite depends on" — `docs/architecture.md`, `.node-version`,
  `.dockerignore`, the compose files, `edge/`, `keycloak/`, `postgres/`,
  workflows — and any hit sets backend, web, mobile *and* the Android
  end-to-end job at once. `docs/architecture.md` is asserted against the
  backend's modules and has nothing to do with the app, yet iteration 10
  task 17's pull request, which changed `web/` and that one document, ran the
  emulator job and went red on an emulator fault.
- **Every push to `dev` runs everything.** The filter "fails open on purpose"
  for `dev` and `main`, so docs-only merges (PRs 516 and 517) paid for the
  whole suite and went red on the emulator with no code involved. Pull-request
  pushes are already filtered; merges are not (quality backlog SHOULD-98).

While this job is the slowest and least reliable in the pipeline, every run it
did not need is a delay and a red mark on a change that cannot cause either.

## Scope

A pull request or a push to `dev` runs the Android end-to-end job, and the
other mobile job, only when its change can affect the app or the stack the app
talks to, and a docs-only or web-only change leaves both skipped with
`CI passed` green.

## Non-goals

- The job's duration and its build step — [task 23](23-the-android-build-reuses-the-native-code-it-compiled.md).
- The emulator's reliability — [task 07](07-mobile-e2e-fails-only-when-the-app-does.md).
- Which suites the *backend*, *web* and *keycloak* jobs run on: the `shared`
  rule keeps its meaning for them; only what it implies for the two mobile
  jobs changes.

## Constraints

- `CI passed` is the required check, and it already counts a skipped job as a
  pass but fails if `changes` itself did not succeed. That guard stays, so a
  broken filter can never read as a skip.
- A filter that skips a job it should have run fails silently: the decision is
  testable on a list of changed files, and the tests cover both directions.
- The workflow, and the filter's own logic, are inputs to every job they
  decide: a change to them runs everything.

**Decided at refinement, 2026-11-01** (product owner):

- **The Android end-to-end job runs on a change to** `mobile/`, `packages/`,
  `backend/`, the lockfiles and root `package.json`, the `Makefile`, the mobile
  and stack-port scripts, the files that define the stack the app talks to
  (the compose files, `edge/`, `keycloak/`, `postgres/`, the Keycloak seed
  scripts) and the workflow itself. It never runs on `docs/` or `web/` alone.
  The flow drives the real backend, so a backend change can break it.
- **The other mobile job follows the same rule narrowed to what it compiles:**
  `mobile/`, `packages/`, the lockfiles, `backend/openapi.json`, and the
  scripts and `Makefile` it runs. `docs/architecture.md` is not among them.
- **A push to `dev` diffs against the commit before the push** and applies the
  same rules, in place of running everything. It still runs everything when
  there is no usable base: a first push, or a forced push where the previous
  commit is unreachable.
- **No scheduled full run.** The filter stays conservative instead.

## Open questions

**None.**

## Acceptance criteria

- [x] A test of the filter shows a docs-only change, a web-only change, and a
      change to `web/` plus `docs/architecture.md` each leaving the Android
      end-to-end job and the other mobile job skipped, and the same cases fail
      against the previous filter
- [x] A test shows a change under each of `mobile/`, `packages/`, `backend/`,
      `edge/`, `keycloak/`, a compose file and the workflow running the
      Android end-to-end job
- [x] A test shows a push to `dev` whose diff is docs-only skipping it, and an
      unreachable previous commit running everything
- [x] A throwaway docs-only commit pushed from the PR's own branch shows the
      Android job skipped and `CI passed` green, with the run linked in the PR
- [x] The place the filter's policy is documented states the new rule, and
      `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-98 (filed as a
second SHOULD-97 by task 07's pull request), widened at the product owner's
request after PR 521 ran the emulator job for a web-only change.

The fourth criterion could not be met literally: a branch carrying this change
also changes `ci.yml`, which runs everything by design. It was met on a
separate throwaway branch that added a docs-only commit and switched off that
one rule, where run 41331615573 shows both mobile jobs skipped and `CI passed`
green; the product owner accepted that on 2026-11-01. Pull request 525.
