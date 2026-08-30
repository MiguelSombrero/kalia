# Task 07: Reject malformed sort parameters and paginate the brewery list

- **Status:** done
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

Two independent gaps in `CatalogController`'s request handling:

- **COULD-8** — the `sort` query parameter accepts trailing garbage (e.g.
  `sort=name,asc,extra`) instead of rejecting it: `parseSort` reads
  `parts[0]` and `parts[1]` and silently discards anything after them.
- **COULD-4** — `listBreweries()` loads and sorts the whole brewery table in
  Java on every call, with no pagination contract on `/api/v1/breweries`.
  Fine at the current ~20 rows; not a contract that scales, and
  `backend/README.md`'s "every request parameter is bounded" convention has
  nothing to bound here because there's no parameter yet.

## Scope

- `parseSort` rejects a `sort` value with more than two comma-separated
  parts instead of silently truncating it.
- `GET /api/v1/breweries` gains a pagination contract (page/size, matching
  `GET /api/v1/beers`'s existing shape) and `listBreweries()` uses it instead
  of loading the full table.

## Non-goals

- Any change to what `sort` accepts when well-formed, or to the brewery
  sort order itself (name, case-insensitive, Java-side for collation
  reasons — that stays).

## Constraints

- `backend/README.md`'s "every request parameter is bounded" convention —
  the new pagination parameters need the same `@Min`/`@Max` treatment
  `GET /api/v1/beers`'s `page`/`size` already get.
- No frontend code calls the generated `listBreweries`/`useListBreweries`
  client yet (confirmed 2026-08-23: no reference anywhere under
  `frontend/features/` or `frontend/app/`), so changing the response shape
  from a bare list to a paginated one has no caller to break.

## Open questions

**None.**

## Acceptance criteria

- [x] `sort=name,asc,extra` (and similar) is rejected with a 400
      `problem+json`, not silently truncated — proven by a new
      `CatalogApiIT` test
- [x] `GET /api/v1/breweries` accepts `page`/`size` and returns a paginated
      response shape; the full-table load is an accepted implementation
      detail to be closed by a later cache of the sorted list, not by
      moving the sort into the database
      ([ADR-0045](../../adr/0045-brewery-list-paginates-in-application.md))
- [x] `mvn clean verify` is green

## Notes

Quality backlog: COULD-8, COULD-4.

During implementation the product owner chose to keep brewery pagination in
the application rather than push it to the database, so the deliberate
locale-independent Java name sort survives; the efficiency gap is left for a
later cache of the sorted list. Recorded as
[ADR-0045](../../adr/0045-brewery-list-paginates-in-application.md), which
also carries the reworded second acceptance criterion above.
