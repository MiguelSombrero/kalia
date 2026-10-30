# Task 15: The Catalog tab lists real beers from the API

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-2, DW-4

## Why

Every piece before this one can be green on its own while the whole does not
work: a shared client nobody calls, a token the backend has never seen from a
device, a CI job with nothing to run. One thin slice through all of it — a
screen, a feature hook, the shared client, the mobile mutator, the API, the
database — is what proves the foundations hold, and it is the flow the
iteration's native end-to-end test runs in CI.

## Scope

The Catalog tab lists beers read from `/api/v1` through the shared client and a
feature hook, with loading, error and empty states. A unit test covers the
screen, and one native end-to-end flow runs in CI.

## Non-goals

- Search, filters, beer detail and the rest of the catalog —
  [iteration 11](../iteration-11.md).
- The catalog's mobile design — also iteration 11.

## Constraints

- [Task 06](06-decision-mobile-testing-strategy.md)'s testing strategy, which
  decides the end-to-end tool, the CI platforms and the backend the flow runs
  against.
- [Task 09](09-shared-packages.md)'s shared client and
  [task 11](11-app-skeleton.md)'s conventions.
- Every catalog read is paginated and bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).

**Decided at refinement, 2026-10-30** (product owner):

- **A row shows the beer's name, brewery, style and ABV,** as the web's
  does.
- **The first page only;** infinite scroll is
  [iteration 11](../iteration-11.md)'s catalog list.
- **Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md)'s model** in
  plain form, until iteration 11 designs them.
- **The end-to-end flow is anonymous.** Driving sign-in through the system
  browser is fragile under Maestro; [task 14](14-sign-in-on-mobile.md)
  checks sign-in by hand on both simulators.
- **The flow is a Maestro flow, run in CI on Android on a Linux runner
  against the full Docker stack, and locally on the iOS Simulator through
  `make verify`** — [task 06](06-decision-mobile-testing-strategy.md)'s
  decision.

## Open questions

**Answered, waiting on an accepted ADR.** Every question raised for this task
was answered at refinement on 2026-10-30 (Constraints). It stays
`needs-refinement` only because [the iteration](../iteration-9.md) has a
decision accepted before the build tasks it binds are refined — here
[task 06](06-decision-mobile-testing-strategy.md)'s. A second pass moves it
once that ADR merges, or reopens a question the ADR contradicts.

## Acceptance criteria

- [ ] On both simulators, the Catalog tab lists beers from the local stack —
      described in the PR
- [ ] A Jest unit test renders the list from a mocked client, and its error
      and empty states
- [ ] A Maestro flow opens the app and finds a seeded beer in the list, runs
      in CI on Android against the full stack as a required check, and was
      confirmed to fail against a build with the list broken
- [ ] The same flow passes on the iOS Simulator through `make verify` —
      described in the PR
- [ ] `make verify` is green
