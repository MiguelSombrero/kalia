# Task 16: An out-of-set `sort` value 400s the catalog page instead of degrading

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

[Task 14](14-catalog-silent-failures.md) makes `GET /api/v1/beers` reject an
unrecognized sort direction (e.g. `?sort=abv,dsc`) with a `problem+json` 400
instead of silently sorting ascending — a deliberate, product-owner-approved
contract change (task 14's Constraints/Decided, 2026-09-12).
`features/catalog`'s own `SearchFilters` dropdown only ever sends one of five
literal values (`name,asc`, `name,desc`, `abv,asc`, `abv,desc`, `style,asc` —
`SearchFilters.tsx:100-104`), so the UI itself is unaffected, which is exactly
what task 14's own frontend-check constraint verified.

But `app/[locale]/beers/page.tsx`'s `toBeerSearchParams` (`page.tsx:20-31`)
passes the raw `sort` URL search param straight through to `searchBeers`
(`features/catalog/api.ts:32-48`) with no validation of its own. A bookmarked
or hand-typed URL carrying any other value — `?sort=abv,dsc`, a stale link
predating task 14, or a typo — used to render a page (silently sorted the
wrong way); once task 14 ships, the same URL makes the server component
throw (`api.ts:44-46`: any non-200 status becomes a thrown `apiError`), which
propagates past the page to the app-wide `app/[locale]/error.tsx` boundary
([ADR-0022](../../adr/0022-loading-error-empty-states.md)) instead of
rendering a catalog page that just ignores the bad param. Task 14 scoped its
own frontend check to "the frontend's own sort values still work" — it did
not cover a value the frontend never sends itself, which is what this task
addresses.

There is already a precedent for exactly this shape in the same file:
`getBeer` (`api.ts:52-57`) regex-validates a UUID taken from the URL and
resolves to `null` rather than letting a malformed id reach the backend as a
400 at all. `searchBeers`/`toBeerSearchParams` have no equivalent guard for
`sort`.

## Scope

An out-of-set `sort` value arriving via the URL no longer reaches the
app-wide error boundary — the catalog page renders for such a URL rather than
throwing.

## Non-goals

- Changing the backend contract again — task 14's 400 for an invalid
  direction stands; this is a frontend-only task.
- Validating `page`, `size`, `minAbv`/`maxAbv`, or any other search param.
  Nothing in this investigation found an equivalent failure mode for them,
  and widening scope without evidence is exactly what
  [ADR-0027](../../adr/0027-process-weight.md) weighs against.
- Changing `SearchFilters`'s own five options or labels.

## Constraints

- **Depends on [task 14](14-catalog-silent-failures.md) shipping first** — the
  failure mode described here does not exist until `GET /api/v1/beers`
  actually starts rejecting an invalid direction with a 400. This task should
  not merge ahead of it.
- Whatever set of accepted values the fix checks against must be kept in sync
  with `SearchFilters.tsx`'s five `<option>` values and with `parseSort`'s own
  whitelist (`SORTABLE` plus case-insensitive `asc`/`desc`, per task 14's
  Decided) — a second hardcoded copy that silently drifts from either is the
  same shape of bug this task exists to close.
- Per [ADR-0023](../../adr/0023-typed-api-failures.md), the caller decides
  what a non-2xx status means; this task is exactly that decision for `sort`,
  in the same spirit as `getBeer`'s existing UUID guard — it is not a case
  for a new blanket "catch all catalog errors" mechanism.
- Feature-boundary conventions ([frontend/README.md](../../../frontend/README.md)):
  `app/` composes, a feature owns its own domain logic. `sort`'s valid set is
  defined by `features/catalog`'s own `SearchFilters`, which bears on where
  the fix belongs (see Open questions).

## Open questions

- **Interaction/UX:** for an unrecognized `sort`, does the page fall back
  silently to the default (`name,asc`) as if the param were absent, or should
  the visitor see some indication their requested sort wasn't honored (e.g.
  a redirect to the canonical URL with the bad param stripped, or an inline
  notice)?
- **Module boundaries:** should the validation live in `toBeerSearchParams`
  (`page.tsx`), in a guard inside `features/catalog/api.ts`/`types.ts`, or as
  a small helper exported from `features/catalog` that both the page and
  `api.ts` can use? There is currently no shared source-of-truth list of the
  five valid values anywhere in the frontend — `SearchFilters.tsx` hardcodes
  its five `<option>`s and `BeerSearchParams.sort` is a bare `string`
  (`types.ts:19`) — so this may also decide whether that list gets a single
  home.
- **Scope of "invalid":** task 14 also rejects a malformed `sort` with more
  than two comma-separated parts ("Malformed sort..."), a different rejection
  than an unrecognized direction. Does this task's fallback cover both shapes
  of rejection, or only the direction case?
- **Completion signal:** does "fixed" require a test asserting the exact
  fallback value (`name,asc`), or is "renders without throwing" sufficient
  regardless of which sort order results?

## Acceptance criteria

- [ ] A request for `/en/beers?sort=abv,dsc` (or another value outside the
      known set) renders the catalog page rather than the app-wide error
      boundary — automated test, confirmed to fail against the current
      pass-through once task 14 is in place
- [ ] `npm test` covers the chosen validation point falling back for a `sort`
      value outside the known set
- [ ] The five values `SearchFilters` actually sends (`name,asc`, `name,desc`,
      `abv,asc`, `abv,desc`, `style,asc`) are still accepted unchanged —
      verified in a browser, not only against the test suite

## Notes

Surfaced while investigating task 14's frontend impact, ahead of task 14
landing — this task's fix should not ship before task 14 does, since the bug
it fixes does not exist until then. Not filed via the quality backlog's
usual sweep-then-lift path; written directly as a task file per instruction,
since the shape of the fix already needed the product owner's input rather
than being ready-to-implement as found.
