# Task 04: Give catalog search usable indexes

- **Status:** done
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`BeerSpecifications.matching` (`backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java`)
builds three filters that no index currently serves well:

- The name filter is a leading-wildcard `LIKE '%...%'` — never index-usable,
  regardless of any index on `catalog.beer.name`.
- The style filter compares `lower(style)` against `beer_style_idx`
  (`V003__catalog_schema.sql`), a plain, non-functional index — it cannot
  serve a case-insensitive comparison.
- `brewery.country` has no index at all.

Invisible at the current seed scale (~54 beers), and will degrade as the
catalog grows — directly relevant now that
[iteration 8](../iteration-8.md) plans to grow it past seed data.

## Scope

Make the style and country filters index-usable, and give the name filter a
search strategy that scales past a full scan — within Postgres, without
introducing a new dependency (see Open questions).

## Non-goals

- Introducing a separate search engine (OpenSearch, etc.) —
  [docs/tasks/backlog.md](../backlog.md) already notes "PostgreSQL full-text
  is fine at this size; OpenSearch only if faceted search outgrows it," and
  nothing in this finding changes that call.
- Any change to the search API's request/response shape — this is a query
  and index change behind the existing contract.

## Constraints

- Migrations are forward-only (`V00N__*.sql` under
  `backend/src/main/resources/db/migration/catalog/`); no editing a shipped
  migration.
- `BeerSpecifications` is reached only through `BeerSearchCriteria`
  ([task 06](06-catalog-module-edge-layering.md) touches how that criteria
  object is constructed, not what it filters on — no ordering dependency
  between the two tasks).
- **Name search strategy** (decided with the product owner 2026-08-23): keep
  substring matching as the contract — current behavior stays. Serve it with
  a `pg_trgm` trigram `GIN` index rather than narrowing to prefix-only
  search. `pg_trgm` ships as a standard contrib extension in the
  `postgres:18.4` image already used ([docker-compose.yml](../../../docker-compose.yml));
  enabling it (`CREATE EXTENSION IF NOT EXISTS pg_trgm`) is not a new
  external dependency requiring a version to pin, just a migration adding
  the extension and the index.
- **Target scale** (decided with the product owner 2026-08-23): validate and
  test against 10,000 beers — comfortably past iteration 8's near-term
  growth off the current ~50–100-beer seed, while cheap enough to seed in an
  automated test. `docs/architecture.md`'s existing latency NFR (<300 ms
  server time) applies at this scale too, though this task's acceptance bar
  is index usage (`EXPLAIN`), not a latency measurement.

## Open questions

**None.**

## Acceptance criteria

- [x] The style filter is served by a functional (case-insensitive) index,
      not `beer_style_idx` as-is
- [x] `brewery.country` has an index the country filter can use
- [x] The name filter keeps substring matching and is served by a `pg_trgm`
      trigram `GIN` index
- [x] An automated test seeds the catalog with 10,000 beers and asserts each
      filtered query (name, style, country) uses the expected index (e.g.
      via `EXPLAIN`), not just that it returns correct results
- [x] `mvn clean verify` is green

## Notes

Quality backlog: SHOULD-1.
