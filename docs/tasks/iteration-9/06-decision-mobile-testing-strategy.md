# Task 06: Decide how the mobile app is tested

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-5

## Why

[architecture.md §7](../../architecture.md) describes testing for a backend and
a web app; Playwright, which carries the web's end-to-end flows, cannot drive a
native app. The iteration's `Done when` asks for unit tests and one native
end-to-end flow in `make verify` and CI, and every build task after this one
writes tests in whatever shape it picks. Picking it per task is how the web
ended up with two test conventions before
[ADR-0026](../../adr/0026-task-file-format.md) required tests in the task that
creates the behaviour.

CI is the hard part. Android emulators run on Linux runners; iOS simulators
need macOS runners, which on a private repository cost minutes the no-cost
constraint may not allow, and which have no Docker to run the stack an
end-to-end flow talks to.

## Scope

The mobile testing strategy is a recorded decision: the unit-test runner and
library, the native end-to-end tool, what runs locally, what runs in CI on
which platform, and what backend an end-to-end flow runs against there.

## Non-goals

- Wiring the tests into `make verify` and CI —
  [task 07](07-process-carries-a-third-codebase.md) and
  [task 15](15-walking-skeleton-slice.md).
- Visual regression testing, and testing on real devices —
  [iteration 10](../iteration-10.md) onwards.

## Constraints

- The plan adds no cost ([backlog](../backlog.md#mobile-client)): CI minutes
  that are billed count.
- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): one
  verify gate, with `make verify-fast` needing neither Docker nor a build.
- Test tools are new dependencies — asked, not researched.

**Decided at refinement, 2026-10-30** (product owner):

- **Jest with React Native Testing Library, through Expo's preset.** Vitest
  is rejected because its React Native support is not first-class.
- **Maestro for end-to-end flows.** It drives the built app from outside,
  with nothing compiled into it, so it works with continuously generated
  native projects as they are. Detox is rejected for the native
  instrumentation it needs in each build.
- **CI runs the end-to-end flow on Android only, on a Linux runner against
  the full Docker stack, as a required check. iOS runs the same flow locally,
  through `make verify`.** One real stack, no mock layer. The repository is
  public, so Actions minutes — macOS ones included — are free; iOS stays out
  of CI because macOS runners have no Docker to run the stack, not because of
  cost. Running iOS in CI against a mocked API was rejected as a second
  backend to keep in step.
- **`make verify-fast` runs mobile lint, type check and unit tests;** native
  builds and the end-to-end flow are in `make verify` only.
- **No coverage threshold,** matching the web, which has none.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the strategy, the rejected tools and their costs, and
      passes `node scripts/check-adrs.mjs`
- [x] `docs/architecture.md` §7 describes mobile testing alongside the web's
- [x] The CI platforms chosen are stated with what they cost this repository,
      checked against the no-cost constraint
- [x] The unit-test and end-to-end test conventions are named in the
      acceptance criteria of tasks [11](11-app-skeleton.md) and
      [15](15-walking-skeleton-slice.md) before either is refined

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 8. A decision task,
so it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
