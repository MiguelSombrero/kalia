# Task 04: Give catalog search usable indexes

- **Status:** needs-refinement
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

## Open questions

- **Constraints and trade-offs:** for the name filter, is a Postgres
  trigram index (`pg_trgm` + `GIN`, unindexed-substring-search's usual fix)
  an acceptable new extension dependency, or does "no `%...%` substring
  search" become the new contract (e.g. prefix-only, `LIKE 'x%'`, which a
  plain b-tree index *can* serve)? These have different UX consequences —
  substring match on beer name is current behavior, and narrowing it is a
  user-facing change, not just a performance one.
- **Non-functional attributes — performance:** what's the target scale to
  validate against (iteration 8's "catalog beyond seed data" doesn't yet say
  a number)? Without one, "the query is fast enough" has no acceptance bar
  to test against.

## Acceptance criteria

- [ ] The style filter is served by a functional (case-insensitive) index,
      not `beer_style_idx` as-is
- [ ] `brewery.country` has an index the country filter can use
- [ ] Whatever the name-search strategy is decided to be (see Open
      questions), it is index-usable at the agreed target scale
- [ ] An automated test seeds the catalog at the target scale and asserts
      each filtered query uses the expected index (e.g. via `EXPLAIN`), not
      just that it returns correct results
- [ ] `mvn clean verify` is green

## Notes

Quality backlog: SHOULD-1.
