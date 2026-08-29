# ADR-0044: Catalog name search stays substring matching, served by a pg_trgm trigram index

- **Status:** accepted
- **Date:** 2026-08-28

## Context

`BeerSpecifications` builds the catalog's search filters, and none of the three
text filters had an index that could serve it. The name filter is a
leading-wildcard `LIKE '%term%'`, which no B-tree can answer whatever is
indexed. The style filter compares `lower(style)`, and the index on `style` was
a plain one on the raw column, so a case-insensitive comparison could not use
it. `brewery.country` had no index at all.

None of this is visible against the ~54 beers the seed migration ships, where a
sequential scan is the correct plan regardless. [Iteration 8](../tasks/iteration-8.md)
plans to grow the catalog past seed data, and
[docs/architecture.md §1](../architecture.md) sets a <300 ms server-time
expectation for catalog search.

The question is what the name filter should *mean* once it has to scale.
Substring matching is what the endpoint documents and what the frontend's
search box implies, but it is also the hardest shape to index.

## Decision

**Substring matching stays the catalog search contract, and a `pg_trgm`
trigram `GIN` index on `lower(name)` serves it; the style and country filters
get functional B-tree indexes on `lower(style)` and `lower(country)`.**

This covers the query plans only. The search API's request and response shapes
are unchanged, `BeerSpecifications` still builds the same predicates, and
nothing here narrows what a search term may match — a term found anywhere in a
beer's name still matches it, with the same case-insensitivity as before.

The trigram index is created with `fastupdate = off`. GIN's default pending
list defers index maintenance to autovacuum, and until that runs the planner
costs the index above a full scan — so a catalog that has just been loaded
would fall back to exactly the scan this index exists to replace.

Future text filters on the catalog follow the same rule: a filter that compares
a function of a column needs an index on that function, and a filter that can
match mid-string needs trigrams rather than a B-tree.

## Alternatives considered

**Narrow the name filter to prefix matching (`term%`) and index `lower(name)`
with a plain B-tree.** The cheapest index by far, and the standard answer when
a leading wildcard is the problem. Rejected because it changes what search
means to the user, and in the way that hurts most for beer: names routinely
carry the brewery in front of the beer, so a prefix-only search stops finding
"Westvleteren 12" for "vleteren" and "St. Bernardus Abt 12" for "bernardus".
The product owner settled this on 2026-08-23 — the contract is the thing being
protected, and the index is chosen to fit it rather than the reverse.

**PostgreSQL full-text search (`tsvector` + `GIN`).** The conventional
Postgres answer for text search, and already sanctioned in the
[backlog](../tasks/backlog.md) as sufficient at this size. Rejected because it
matches whole lexemes, not substrings: a mid-word fragment finds nothing, so
"vleteren" would still miss "Westvleteren". Its stemming is also tuned for
prose and misfires on brand names.

**A separate search engine (OpenSearch or similar).** Rejected without much
weighing: the [backlog](../tasks/backlog.md) already records that PostgreSQL is
fine at this size and that an engine is warranted only if faceted search
outgrows it, and nothing found here changes that.

**Index style and country, leave the name filter scanning.** Rejected because
name is the filter the search box drives; leaving it unindexed would fix the
two cheap cases and none of the expensive one.

## Consequences

- Good, because all three text filters are now served by an index the planner
  actually picks, and `BeerSearchIndexIT` asserts that against a catalog of
  10,000 beers rather than assuming it.
- Good, because the search contract is unchanged: no caller, test, or piece of
  frontend has to know this happened.
- Bad, because a trigram index over every beer name is large relative to the
  table and, with `fastupdate = off`, makes each catalog write pay its
  maintenance immediately rather than in a later autovacuum. Acceptable here
  only because the catalog is written rarely and read constantly.
- Bad, because a search term shorter than three characters has no complete
  trigram, so Postgres falls back to a sequential scan for it. The API sets no
  minimum query length, so this is reachable today; it is a
  [backlog](../tasks/backlog.md) line rather than something fixed here, since
  imposing a minimum would change the API contract this ADR deliberately keeps.
- Neutral, because the migration issues `CREATE EXTENSION`, which needs the
  database owner or a superuser. `pg_trgm` is a trusted extension, so a
  database owner suffices, but a deployment that runs migrations as a
  lower-privileged role will fail at migration time rather than silently.
- **Revisit trigger:** faceted search, relevance ranking, or a catalog past
  roughly a million beers — any of the three moves the question outside what a
  trigram index answers well.

## Evidence

Measured 2026-08-28 against **PostgreSQL 16.13**, not the `postgres:18.4` this
project pins everywhere: the verification environment had no Docker, so the
migrations and the queries below were replayed on a locally installed server
instead. Costs are therefore indicative rather than reproducible on what CI and
`docker compose` run. What CI enforces on 18.4 is `BeerSearchIndexIT`'s
assertion that each plan names the expected index, which carries no numbers.

The fixture is the test's: 10,000 beers across 2,000 breweries, `ANALYZE` run,
and `plan_cache_mode = force_generic_plan` so the plan is the value-independent
one — the same plan Postgres settles on once pgjdbc server-prepares a
statement, and the one the test asserts. Statements are the ones Hibernate
emits for the search endpoint's first page.

Sequential-scan baselines at this fixture size: `beer` 244.54, `brewery` 41.20.

- Page query, name filter: `Bitmap Index Scan on beer_name_trgm_idx`, cost
  13.07, feeding a bitmap heap scan at 115.47.
- Count query, name filter: same index, `Aggregate` at 115.60.
- Count query, style filter: `Bitmap Index Scan on beer_style_lower_idx`, cost
  6.71, `Aggregate` at 156.48.
- Count query, country filter: `Bitmap Index Scan on brewery_country_lower_idx`,
  cost 5.66, against the 41.20 sequential scan of `brewery` it replaces. The
  `beer` side of that join is a sequential scan either way — the filter selects
  roughly 9% of the catalog, which is past the point where an index helps.
- With `fastupdate` left at its default `on`, the name query plans as
  `Seq Scan on beer` immediately after the rows are inserted and only picks the
  index once `VACUUM` has flushed the pending list. This is what
  `fastupdate = off` in `V003__catalog_schema.sql` is for, and
  `BeerSearchIndexIT.nameFilterUsesTheTrigramIndex` fails if it is removed.
- `lower(name) LIKE '%ip%'` — `Seq Scan on beer`, 10,047 rows removed by
  filter: too short to yield a trigram, as the consequence above records.
