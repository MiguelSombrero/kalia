# Task 09: Batch beer lookup for the cellar page

- **Status:** done
- **Iteration:** [6](../iteration-6.md)

## Why

The cellar page (iteration 5 task 11) shows one row per beer the caller
owns, enriched with that beer's name, brewery, style and ABV from the
catalog. `features/cellar/api.ts`'s `listCellarEntries` gets there by
calling the catalog's `getBeer(beerId)` once per cellar entry — an N+1
pattern: a cellar of N distinct beers issues N parallel backend round-trips
on every page load instead of one, and each of those N calls independently
re-derives the caller's access token from Valkey
(`frontend/lib/api/accessToken.ts`), compounding the cost. The backend's
catalog module has no bulk "beers by ids" endpoint today
(`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java`
exposes only `GET /beers` for search/paginate and `GET /beers/{id}` for
one), so the frontend has no way to avoid this.

Flagged during code review of iteration-5 task 11
([PR #158](https://github.com/MiguelSombrero/kalia/pull/158)) but out of
scope there — closing the gap needs a new backend endpoint, not a frontend
change alone. `docs/architecture.md` documents a cellar as "realistically
far smaller than the catalog," so this is not urgent, but it is a real,
easily reproduced inefficiency worth fixing rather than carrying forward
indefinitely.

## Scope

A bulk beer-lookup endpoint in the catalog module, and
`features/cellar/api.ts` switched from N calls to `getBeer` to one call to
this endpoint.

## Non-goals

- Any change to the cellar page's rendered output, ordering, or the
  acceptance criteria iteration-5 task 11 already shipped — this task only
  changes how beer data is fetched, not what is shown.
- Batch lookup for any consumer other than the cellar page. Nothing else in
  the frontend currently needs one.
- Paginating or otherwise changing the catalog's existing `GET /beers`
  search endpoint.

## Constraints

- The new endpoint follows the existing orval-generation pipeline
  ([ADR-0012](../../adr/0012-orval-api-client.md)): add it to the backend's
  OpenAPI-documented controller, run `npm run generate:api`, commit the
  regenerated client — CI's drift check enforces this stays in sync.
- Catalog endpoints stay public, unauthenticated
  (`docs/architecture.md` §5) — this one is no exception, even though its
  only caller today is the (authenticated) cellar page.
- `features/cellar/api.ts` remains the only file reaching into
  `lib/api/generated/catalog/**` from the cellar feature
  ([ADR-0012](../../adr/0012-orval-api-client.md)'s import-boundary rule);
  no new cross-feature import.
- **The endpoint is `GET /api/v1/beers/batch?ids=…&ids=…`**, a repeated query
  parameter binding to a `List<UUID>`, answering a bare `BeerSummaryDto[]`.
  Bare rather than the `PageDto` envelope `GET /beers` uses: there is no
  pagination here, so the envelope's `totalPages` and `page` would be fiction.
  A dedicated path rather than `ids` on `/beers`, so `ids` never has to be
  made mutually exclusive with every search and pagination parameter.
- **An id matching nothing is omitted from the response**, not returned as a
  null. The cellar page already handles a beer it cannot resolve — iteration 5
  [task 11](../iteration-5/11-cellar-page.md)'s single-`getBeer` 404 path — so
  omission reuses that path instead of adding a second one beside it.
- **Capped at 100 ids; over the cap it answers 400**, never a silent
  truncation. The bound is required by
  [ADR-0042](../../adr/0042-bounded-request-parameters.md) and the cap is what
  keeps the URL inside ordinary length limits.
- **`getBeer` stays.** The beer detail page needs `BeerDetailsDto`, a
  different and fuller shape, so retiring it would either cost that page
  fields or make this endpoint serve two shapes.
- Enriching `GET /api/v1/cellar` server-side is **not** the answer here, and
  not an open question: [architecture.md §4](../../architecture.md)'s
  client-agnostic-resources convention names the cellar endpoint as exactly
  this temptation. Assembling two resources into one view stays the client's
  job.

## Open questions

**None.**

## Acceptance criteria

- [x] The cellar page issues one backend call to enrich all of a user's
      cellar entries with beer data, regardless of how many distinct beers
      are in the cellar — verified by a frontend test asserting the fetch
      call count for a multi-entry cellar
- [x] The new endpoint returns the correct beer for each requested id and
      is documented in the OpenAPI spec — backend integration test (`*IT`)
- [x] An id matching no beer is omitted rather than returned as null, and the
      cellar page renders the remaining entries — backend `*IT` for the
      omission, frontend test for the page
- [x] More than 100 ids answers 400 rather than truncating — backend `*IT`,
      confirmed to fail against an unbounded implementation
- [x] `npm run generate:api` regenerates `lib/api/generated/` with no
      uncommitted drift — CI's `api-client-drift` job stays green

## Notes

Raised as a code-review finding on
[iteration-5 task 11](../iteration-5/11-cellar-page.md), which shipped the
N+1 call as a known, documented trade-off rather than block on a backend
change out of that task's scope.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)).
