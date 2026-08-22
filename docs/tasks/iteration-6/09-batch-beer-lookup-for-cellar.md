# Task 09: Batch beer lookup for the cellar page

- **Status:** needs-refinement
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

## Open questions

- **Functional scope and behaviour:** should the endpoint return an empty
  array for an id that doesn't match anything, or omit it from the
  response? Cellar's caller needs to know the difference either way (a
  stale `beerId` pointing at a removed catalog beer is possible — see
  iteration-5 task 11's own handling of a single `getBeer` 404).
- **Domain and data model:** what response shape — a bare array of
  `BeerSummaryDto` (matching what the cellar page actually needs), or the
  same `PageDto`-style envelope `GET /beers` already uses? A bare array has
  no pagination metadata to keep in sync with a request that has no
  pagination.
- **Integrations and external dependencies:** request shape — a repeated
  query parameter (`?ids=a&ids=b`), a comma-separated one (`?ids=a,b`), or
  a POST body? Affects both the OpenAPI spec and how large a cellar can get
  before hitting a URL-length limit.
- **Edge cases and failure handling:** is there a cap on how many ids one
  request may carry, and what happens past it (400, or silently truncated)?
- **Constraints and trade-offs:** does this replace `getBeer(id)` entirely
  (a single-id call becomes a one-element batch call), or do both endpoints
  stay, with `getBeer` kept for the beer detail page
  (`app/[locale]/beers/[id]/page.tsx`) and the batch endpoint added
  alongside it?
- **Terminology consistency:** endpoint name and path — e.g. `GET
  /api/v1/beers?ids=...` (reusing the existing `/beers` route) versus a
  dedicated `GET /api/v1/beers/batch`.

## Acceptance criteria

- [ ] The cellar page issues one backend call to enrich all of a user's
      cellar entries with beer data, regardless of how many distinct beers
      are in the cellar — verified by a frontend test asserting the fetch
      call count for a multi-entry cellar
- [ ] The new endpoint returns the correct beer for each requested id and
      is documented in the OpenAPI spec — backend integration test (`*IT`)
- [ ] `npm run generate:api` regenerates `lib/api/generated/` with no
      uncommitted drift — CI's `api-client-drift` job stays green

## Notes

Raised as a code-review finding on
[iteration-5 task 11](../iteration-5/11-cellar-page.md), which shipped the
N+1 call as a known, documented trade-off rather than block on a backend
change out of that task's scope.
