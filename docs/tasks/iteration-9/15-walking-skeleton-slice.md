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

## Open questions

1. **What does a row show?** Beer and brewery names at least; style and ABV are
   what the web shows.
2. **First page only, or infinite scroll?** Infinite scroll is the native
   expectation and costs a paging hook now rather than in iteration 11.
3. **Loading, error and empty states** — the web's model
   ([ADR-0022](../../adr/0022-loading-error-empty-states.md)) carried over, or
   deferred until the design language exists?
4. **Is the end-to-end flow signed in**, so that it also proves the sign-in of
   [task 14](14-sign-in-on-mobile.md) in CI, or anonymous to keep it short?

## Acceptance criteria

- [ ] On both simulators, the Catalog tab lists beers from the local stack —
      described in the PR
- [ ] A unit test renders the list from a mocked client, and its error and
      empty states
- [ ] A native end-to-end flow opens the app and finds a seeded beer in the
      list, runs in CI as a required check, and was confirmed to fail against
      a build with the list broken
- [ ] `make verify` is green
