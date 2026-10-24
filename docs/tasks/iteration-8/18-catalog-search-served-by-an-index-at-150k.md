# Task 18: Catalog search stays within budget at 150k beers

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

[Task 04](04-catalog-caching-decision.md) measured catalog reads at a
generated 150k-beer catalog, at 20 concurrent requests
([ADR-0078](../../adr/0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)).
Two search shapes broke the 300 ms p95 budget, and neither has an index that
can serve it. That is why the product owner chose to fix them rather than
cache them.

- **An unfiltered page took 357 ms p95.** It is the catalog's landing page:
  a search with no filter, under the default sort. Nothing indexes
  `lower(name), id`, so every request sorts all 150k rows to return 20 of
  them. The same sort runs under the style and country filters, at 77 ms and
  101 ms p95.
- **A 1–2-character name query took 746 ms p95.** A pattern that short
  yields no trigrams, so [ADR-0044](../../adr/0044-catalog-search-indexes.md)'s
  index cannot serve it. Its page sorts most of the table, and its `COUNT`
  scans the whole table. pgjdbc server-prepares the statement after five uses,
  and Postgres's generic plan for `LIKE $1` then picks the trigram index
  anyway. That plan reads every index entry, slower than the sequential scan
  it replaced.

An experimental B-tree on `(lower(name), id)` brought the unfiltered page to
28 ms, style to 29 ms and country to 35 ms. Short queries stayed at 662 ms,
because the index fixes their page but not their count.

At today's 13.6k beers both shapes are within budget, at 42 ms and 63 ms.
This task makes the budget hold as users grow the catalog. Otherwise the
first sign would be a slow landing page.

## Scope

Catalog search reads at 150k beers fall within 300 ms p95 server time, at 20
concurrent requests, for two shapes:

- the unfiltered page under the default sort;
- a 1–2-character name query.

Each fix is a plan that `BeerSearchIndexIT` can pin.

## Non-goals

- A cache. ADR-0078 decided against one, and this task is what that
  decision rests on.
- Deep pages. [Task 08](08-catalog-search-bounded-end-to-end.md) bounds the
  `OFFSET`.
- The brewery list's full-table sort in Java. That is quality backlog
  SHOULD-61, against [ADR-0045](../../adr/0045-brewery-list-paginates-in-application.md).
- `sort=abv,desc`, which measured 228 ms. It is within budget, so no index is
  added for it.

## Constraints

- **The substring contract stays**
  ([ADR-0044](../../adr/0044-catalog-search-indexes.md)) unless the product
  owner changes it. A minimum query length is a contract change, and so is
  anything that stops a 1–2-character term from matching mid-name.
- An index is a Flyway migration under `db/migration/catalog`. Its cost is
  write amplification on the add-a-beer path
  ([task 02](02-add-beer-api.md)), and it needs naming against that.
- Measured with the method in
  [architecture.md §7](../../architecture.md#catalog-read-latency), so the
  before and after figures compare.

**Decided at refinement, 2026-10-23** (product owner):

- **Short queries get custom plans, scoped to the search.** The search's
  read-only transaction runs `SET LOCAL plan_cache_mode = force_custom_plan`,
  so Postgres plans each short pattern by its value rather than with the
  generic plan that reads every trigram entry. No other statement is
  affected, which rules out a connection-wide `prepareThreshold` or
  `plan_cache_mode`. Three alternatives were rejected:
  - a minimum query length of 3, because it changes ADR-0044's contract;
  - an approximate count, because the result summary and the past-last-page
    redirect in `app/[locale]/beers/page.tsx` read `totalElements` as exact;
  - accepting the shape without trying the fix first.
- **If the repeated measurement still puts short queries over budget**, the
  exception is recorded in ADR-0078's Evidence with the figures. The
  contract does not change to meet the budget.
- **One sort index, on `(lower(name), id)`.** The style and country filters
  measured within budget under the default sort without a composite index.
  `sort=abv,desc` is a non-goal above. Its write cost on the add-a-beer path
  is one more B-tree insert per beer, which is named in the migration's PR.
- **The decision is recorded by amending existing ADRs**, not by new ones
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
  [ADR-0044](../../adr/0044-catalog-search-indexes.md) is amended where its
  Bad consequence says a short term falls back to a sequential scan.
  [ADR-0078](../../adr/0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)'s
  Evidence gains the repeated figures.

## Open questions

**None.**

## Acceptance criteria

- [x] `BeerSearchIndexIT` asserts that an unfiltered page under the default
      sort uses an index matching that sort — integration test, confirmed to
      fail without the migration
- [x] A 1–2-character name query's count, run the way the search runs it,
      does not use `beer_name_trgm_idx` — integration test, confirmed to fail
      without the scoped `force_custom_plan`
- [x] The architecture.md §7 method, repeated at 150k beers, shows the
      unfiltered page and 1–2-character name queries under 300 ms p95 server
      time. If short queries are still over budget, the exception and its
      figures are in ADR-0078's Evidence instead. The numbers are in the PR
- [x] ADR-0044 carries an `Amended:` line for the short-query fix, ADR-0078's
      Evidence carries the repeated figures, and
      `node scripts/check-adrs.mjs` passes
- [x] `mvn clean verify` is green

## Notes

Raised by [task 04](04-catalog-caching-decision.md)'s measurement, whose
refinement made a missing index a finding rather than a reason to cache.
