# Task 16: An out-of-set `sort` value 400s the catalog page instead of degrading

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

[Task 14](14-catalog-silent-failures.md), now `done`, made `GET
/api/v1/beers` reject an unrecognized sort direction (e.g. `?sort=abv,dsc`)
with a `problem+json` 400 instead of silently sorting ascending — a
deliberate, product-owner-approved contract change (task 14's
Constraints/Decided, 2026-09-12; confirmed in the shipped code,
`CatalogController.parseSort`). `features/catalog`'s own `SearchFilters`
dropdown only ever sends one of five literal values (`name,asc`, `name,desc`,
`abv,asc`, `abv,desc`, `style,asc` — `SearchFilters.tsx:100-104`), so the UI
itself is unaffected, which is exactly what task 14's own frontend-check
constraint verified.

But `app/[locale]/beers/page.tsx`'s `toBeerSearchParams` (`page.tsx:20-31`)
passes the raw `sort` URL search param straight through to `searchBeers`
(`features/catalog/api.ts:32-48`) with no validation of its own. A bookmarked
or hand-typed URL carrying any other value — `?sort=abv,dsc`, a stale link
predating task 14, or a typo — used to render a page (silently sorted the
wrong way); now that task 14 has shipped, the same URL makes the server
component throw (`api.ts:44-46`: any non-200 status becomes a thrown
`apiError`), which propagates past the page to the app-wide
`app/[locale]/error.tsx` boundary
([ADR-0022](../../adr/0022-loading-error-empty-states.md)) instead of
rendering a catalog page that just ignores the bad param. This is a live
regression today, not a hypothetical one. Task 14 scoped its own frontend
check to "the frontend's own sort values still work" — it did not cover a
value the frontend never sends itself, which is what this task addresses.

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

- **[Task 14](14-catalog-silent-failures.md) has already shipped** (`done`,
  merged into `dev`) — the regression this task describes is live, not
  anticipated; the fix here can proceed without waiting on anything else.
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
  the fix belongs (see Decided below).

**Decided 2026-09-20 (product owner).**

- **Silent fallback, no visible indication.** An out-of-set `sort` renders the
  catalog page sorted by the default (`name,asc`), exactly as if the param
  were absent. No redirect to a canonical URL and no inline notice — the
  address bar keeps the original (bad) param untouched. The simpler of the
  three options considered, and consistent with how a missing `sort` already
  behaves.
- **Both rejection shapes fall back, not only the direction case.** Task 14
  rejects two shapes — an unrecognized direction (`abv,dsc`) and a malformed
  `sort` with more than two comma-separated parts. Both count as "outside the
  known set" and both fall back to the default; there is one check ("is this
  one of the five accepted literals"), not a rule per rejection shape.
- **The five valid values get a single exported home in `features/catalog`.**
  Both `SearchFilters.tsx`'s `<option>`s and the new validation guard consume
  the same exported list/type — not two hardcoded copies that can drift, which
  is the failure mode this task exists to close (see Constraints above).
  Exactly where within `features/catalog` (`types.ts` vs. a small dedicated
  module) is an implementation detail, not a task-file decision.
- **The fallback value is asserted exactly, not just "renders."** The
  acceptance test proves an out-of-set `sort` resolves to `name,asc`
  specifically, not merely that the error boundary is avoided — so a future
  change landing on some other unintended default is caught.

## Open questions

**None.**

## Acceptance criteria

- [ ] A request for `/en/beers?sort=abv,dsc` (unrecognized direction) renders
      the catalog page sorted by `name,asc` rather than the app-wide error
      boundary — automated test, confirmed to fail against the current
      pass-through
- [ ] A request for a malformed `sort` with more than two comma-separated
      parts (e.g. `/en/beers?sort=abv,asc,extra`) also renders the catalog
      page sorted by `name,asc` rather than the app-wide error boundary —
      automated test, confirmed to fail against the current pass-through
- [ ] `npm test` covers the chosen validation point falling back to exactly
      `name,asc` for both invalid shapes above
- [ ] The five values `SearchFilters` actually sends (`name,asc`, `name,desc`,
      `abv,asc`, `abv,desc`, `style,asc`) are still accepted unchanged —
      verified in a browser, not only against the test suite
- [ ] `SearchFilters.tsx`'s five `<option>` values and the new validation
      guard both read from one exported list — no second hardcoded copy of
      the five literals

## Notes

Surfaced while investigating task 14's frontend impact, shortly after task 14
merged. Not filed via the quality backlog's usual sweep-then-lift path;
written directly as a task file per instruction, since the shape of the fix
already needed the product owner's input rather than being
ready-to-implement as found.
