# Task 05: Close catalog search test gaps

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

Two independent test-coverage gaps around already-shipped catalog search
behavior:

- **SHOULD-2** — `frontend/features/catalog/api.ts`'s `searchBeers` has no
  direct unit test for its status check or numeric-string coercions;
  `features/catalog/api.test.ts` covers `buildBeerSearchParams` and
  `getBeer` only, leaving `searchBeers` reached solely through page-level
  tests.
- **COULD-6** — `backend/src/test/java/fi/kalia/catalog/web/CatalogApiIT.java`
  has no test that sorts by `style`, even though it is one of the three
  properties `CatalogController.SORTABLE` accepts and one of the two that
  get `ignoreCase()`. (This finding's `minAbv > maxAbv` half is already
  resolved: `invertedAbvRangeYieldsProblemJson400WithGuidance` and
  `equalAbvBoundsAreAccepted` cover it.)

Neither is a behavior bug — both are gaps where existing correct behavior
has no test pinning it, so a future change could break either silently.

## Scope

- A `frontend/features/catalog/api.test.ts` test (or tests) covering
  `searchBeers`'s status check and numeric-string coercions directly.
- A `CatalogApiIT` test sorting by `style`, mirroring the existing
  `sortsByAbvDescending` shape.

## Non-goals

- Any change to `searchBeers` or the sort behavior themselves — this task
  only adds coverage for what already exists.

## Constraints

**None.**

## Open questions

**None.**

## Acceptance criteria

- [ ] `features/catalog/api.test.ts` has a `describe("searchBeers", ...)`
      block covering the non-200 status path and the numeric-string
      coercion of `minAbv`/`maxAbv`/`page`/`size`
- [ ] `CatalogApiIT` has a test sorting by `style` (both directions or at
      least confirming `ignoreCase()` behavior), following
      `sortsByAbvDescending`'s pattern
- [ ] `npm test` and `mvn clean verify` are green

## Notes

Quality backlog: SHOULD-2, COULD-6.
