# ADR-0045: The brewery list paginates in the application, keeping its Java-side name sort

- **Status:** accepted
- **Date:** 2026-08-29

## Context

`GET /api/v1/breweries` returned the whole `catalog.brewery` table as a bare
JSON array. `CatalogService.listBreweries` loaded every row and sorted it in
Java with `String.CASE_INSENSITIVE_ORDER` — deliberately in the application,
because Postgres, glibc and ICU collations order punctuation and diacritics
differently from each other (`Brasserie d'Orval` against `Brasserie de
Rochefort`, `Põhjala`), and the API's brewery order must not shift with the
deployment's locale.

Quality finding COULD-4: there is no pagination contract on the endpoint, so
`backend/README.md`'s "every request parameter is bounded" convention
([ADR-0042](0042-bounded-request-parameters.md)) has nothing to bound, and the
full-table load is not a shape that scales. It is fine against the ~20 seed
rows today; [iteration 8](../tasks/iteration-8.md) grows the catalog past seed
data.

The question is how to add the pagination contract without giving up the
locale-independent ordering.

## Decision

**`GET /api/v1/breweries` gains the same `page`/`size` contract as
`GET /api/v1/beers`, but the sort and the slice are both applied in the
application: `CatalogService` still loads the full table, sorts it in Java,
and returns the requested page from the sorted list.** Pagination is not
pushed to the database.

The response shape changes from a bare array to the `PageDto` envelope
(`content`, `totalElements`, `totalPages`, `page`). `page`/`size` carry the
same `@Min`/`@Max` bounds as the beers endpoint, with the size cap named as
`CatalogController.MAX_PAGE_SIZE`. The name sort itself is unchanged.

When brewery read volume justifies it, the full-table load goes behind a
cache of the sorted list — one cache key, invalidated whenever a brewery
changes — not a move to database-side sorting.

## Alternatives considered

**Database-side pagination and sorting** — `breweries.findAll(pageable)` with
`Sort.by("name").ignoreCase()`. Rejected: `ignoreCase()` emits `ORDER BY
upper(name)`, which is evaluated under the column's collation. That orders
`d'Orval` / `de Rochefort` and the diacritic in `Põhjala` differently from
`String.CASE_INSENSITIVE_ORDER`, so the brewery order would depend on the
deployment's locale — the exact non-determinism the Java sort exists to
prevent.

**Give `brewery.name` a `COLLATE "C"` clause** so `upper(name)` in SQL matches
Java's code-point ordering, then paginate in the database. Rejected as
disproportionate: it is a schema change to the same column the `pg_trgm`
search index sits on ([ADR-0044](0044-catalog-search-indexes.md)), made for a
table that will not be large enough to need database-side pagination before
the sorted-list cache is warranted anyway.

**Leave the endpoint unpaginated.** Rejected: that is COULD-4 unresolved, and
[ADR-0042](0042-bounded-request-parameters.md)'s bounded-parameter convention
needs `page`/`size` to exist before it can bound them.

## Consequences

- Good, because the brewery order is now identical across every environment
  regardless of database or OS collation, and the endpoint matches the beers
  endpoint's pagination shape and bounds.
- Bad, because `CatalogService.listBreweries` still reads and sorts the entire
  table on every uncached call — `page`/`size` bound the response, not the
  work behind it. The contract is honest about scale before the
  implementation is.
- Neutral, because the response is now a `PageDto` envelope rather than a bare
  array; no caller depended on the old shape (no reference to the generated
  `listBreweries` client anywhere under `frontend/` as of 2026-08-23).
- **Revisit trigger:** brewery row count or read volume grows enough to
  matter — add the sorted-list cache then, and only if that is still not
  enough, reconsider a database-side `COLLATE "C"` sort.
