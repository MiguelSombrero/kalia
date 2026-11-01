# Task 07: The mobile end-to-end check fails only when the app does

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

`Mobile E2E (Maestro, Android)` is a required check
([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)),
and it fails for reasons that have nothing to do with the change it checks.
`dev`'s run after PR 500 went red with `device offline` at the flow's
`launchApp` while the same code had passed on its pull request, and an earlier
API 37 boot timeout is the same family
([common-failures](../../common-failures.md)). A required check that fails one
run in a few teaches people to re-run rather than read, and this iteration's
build-variant and phone work changes the app the job builds more than any
iteration before it (SHOULD-96).

The flow is brittle in a second way: `mobile/.maestro/catalog-lists-beers.yaml`
asserts a Wikidata-import beer that happens to sort onto the first screen, so a
catalog change that adds an earlier name fails the check with no change to the
app (COULD-105).

And the job is slow for want of a cache: it downloads Maestro's 350 MB zip and
compiles the whole Android app cold on every run (COULD-104), which makes each
spurious failure cost the longest re-run in CI.

## Scope

The Android end-to-end job goes red only when the app's behaviour is wrong:
the emulator is healthy before the flow starts, and the flow's assertions hold
for any catalog content the seed allows. Its run time is measured, and cached
where that pays.

## Non-goals

- An iOS job in CI: ADR-0096 decided Android is the only CI platform.
- Retrying the flow itself — a retried flow hides a real failure.

## Constraints

- ADR-0096: Maestro on Android, against a release build.
- **Never skip, disable or quarantine a test to get green** (the PR-activity
  rules); a boot retry is acceptable, a flow retry is not.
- A cache key built from the lockfile, so a stale build cannot be restored
  (COULD-104).
- **No billed CI minute** (`CLAUDE.md`): a larger runner is out.
- A known CI failure goes in [`docs/ci-playbook.md`](../../ci-playbook.md), an
  unexpected one in `docs/common-failures.md`
  ([ADR-0084](../../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
- A new Action or a new version of one is a new dependency — asked, not
  researched.

**Decided at refinement, 2026-11-01** (product owner):

- **Healthy means all three:** the device is attached (`adb wait-for-device`),
  `sys.boot_completed` is set, and the package manager answers — checked
  before `launchApp`. Up to two boot attempts; after that the job fails as an
  infrastructure failure, named as such in its log. The flow itself is never
  retried.
- **The emulator stays API 36 and its current image** unless the
  investigation points elsewhere; a change is named in the PR with the
  evidence.
- **The flow asserts that catalog rows exist,** found by a test id rather than
  by a beer's name, so no test-only seed row is needed.
- **Maestro and Gradle are cached now,** keyed on the lockfile, and the run
  time is measured before and after.
- The runs happen on the PR's own branch before merge
  ([after-merge rule](../iteration-10.md#refinement)); the count and shape
  were changed to 20 parallel trials on 2026-11-01 (see the criteria).
- The cache Actions' versions are proposed at implementation and confirmed in
  the PR ([iteration index](../iteration-10.md#refinement)).

## Open questions

**None.**

## Acceptance criteria

- [x] The job waits for a healthy emulator before `launchApp`, and a test of
      the start-up script covers the unhealthy-device path
- [x] The Catalog flow passes against a catalog with an extra beer that sorts
      before today's first one, shown by a run on a branch that adds one
- [ ] 20 parallel trials of the job on the final commit: zero app failures
      and at most one infrastructure failure, each named "Infrastructure
      failure" by the script and explained in `docs/ci-playbook.md`. (Replaces
      "ten consecutive runs" at the product owner's decision of 2026-11-01:
      ten serial greens pass about one time in five at a 14 % flake rate, and
      take two and a half hours.)
- [x] The job's run time before and after is recorded in the PR, and any cache
      is keyed on the lockfile
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-96, COULD-105 and
COULD-104. Iteration 9's closing note filed SHOULD-96.
