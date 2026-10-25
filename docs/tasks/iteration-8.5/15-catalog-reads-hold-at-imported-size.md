# Task 15: The catalog's lookup reads hold at the size it now is

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**The brewery list and its search hydrate the whole table.**
`CatalogService.listBreweries` (`backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:64-74`)
loads every brewery with `findAll()`, or every substring match with
`findByNameContainingIgnoreCase` (`BreweryRepository.java:11`, an `upper(name)
LIKE '%x%'` no index serves), sorts in Java with `String.CASE_INSENSITIVE_ORDER`,
and only then paginates. That is about 4,900 entities per anonymous request
today, and the add-beer form's brewery field calls the search branch on every
debounced keystroke (`frontend/features/catalog/BreweryField.tsx:40-45`), so
typing "b" loads and sorts thousands of breweries to show 8.
[ADR-0045](../../adr/0045-brewery-list-paginates-in-application.md)'s own
revisit trigger (`:76-78`) has fired: `docs/architecture.md:54` records the
brewery list over budget, at 1,112 ms p95 against a generated 54k breweries in
[ADR-0078](../../adr/0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)'s
2026-10-24 measurement. ADR-0045 is still `accepted`, and
`docs/architecture.md:452-454` still presents its approach as the convention.

The sort is in Java deliberately: database collations disagree on punctuation
("d'Orval"), and the Java order keeps the API's order identical in every
environment. That order is the contract any fix has to keep, or change on
purpose.

**`GET /styles` scans every beer.** `SELECT DISTINCT b.style FROM Beer b`
(`catalog/domain/BeerRepository.java:52-53`) runs over ~13.6k rows today and
150k in the measured case, with no index on the raw column (only
`lower(style)` is indexed), then sorts in Java (`CatalogService.java:77`), on
every opening of the add-beer dialog (`features/catalog/actions.ts:43-46`). It
is anonymous-callable and not in ADR-0078's latency table.

**Two indexes duplicate a constraint's.** `feed.line.sequence_number` is
already indexed by its `UNIQUE` (`V007__feed_schema.sql:18`) and gets a second
`line_sequence_number_idx` (`:25`); `cellar.entry`'s `UNIQUE (user_id, beer_id)`
serves lookups by `user_id` (`V005__cellar_schema.sql:14`) beside
`entry_user_id_idx` (`:17`). Extra write work on a feed table that is never
pruned.

## Scope

The brewery list and brewery search cut their page in the database and stay
within ADR-0078's budget at the measured 150k, in an order the product owner
has chosen. `/styles` is measured and within budget. The duplicate indexes go.

## Non-goals

- Adding a cache — ADR-0078 decided against one.
- The brewery questions the add-beer form asks — [task 05](05-brewery-questions-answered-by-the-api.md).

## Constraints

- [ADR-0078](../../adr/0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)'s
  method in `docs/architecture.md` §7 is how the result is measured.
- [ADR-0044](../../adr/0044-catalog-search-indexes.md): `pg_trgm` is installed
  and is how substring search is indexed.
- [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md): schema changes
  go into the migration they belong to; V008 is generated, never hand-edited
  (`backend/README.md`).
- ADR-0045 is superseded or amended, not rewritten.

**Decided at refinement, 2026-10-24** (product owner):

- **A stored sort key:** a normalised-name column, maintained by the Wikidata generator and the add-beer flow, with an index; the database cuts the page and the order is the one today's Java sort gives, in every environment. A collated `ORDER BY` was rejected because its order at the edges would change. Recorded in a new ADR superseding [ADR-0045](../../adr/0045-brewery-list-paginates-in-application.md).
- **`/styles` is measured first** at 150k by §7's method and added to ADR-0078's table; it is changed only if over budget.

## Open questions

**None.**

## Acceptance criteria

- [x] A brewery page and a brewery search each cut their page in SQL —
      `BreweryRepository` integration tests assert the plan, as
      `BeerSearchIndexIT` does for beers
- [x] An integration test pins the brewery order on punctuation and accent
      cases the decision names, including "d'Orval"
- [x] The brewery list, brewery search and `/styles` are measured by §7's
      method at 150k and within budget, recorded in ADR-0078
- [x] The duplicate indexes are gone, and `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-61, COULD-62 and
COULD-59. Merged because each is an anonymous catalog read, or an index, whose
cost was set when the catalog had 54 beers.
