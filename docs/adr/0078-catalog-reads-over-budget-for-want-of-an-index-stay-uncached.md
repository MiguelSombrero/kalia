# ADR-0078: Catalog reads that break their budget at 150k beers lack an index, not a cache, so the catalog stays uncached

- **Status:** accepted
- **Date:** 2026-10-18
- **Amended:** 2026-10-24 by [task 18](../tasks/iteration-8/18-catalog-search-served-by-an-index-at-150k.md)
  — the unfiltered page and 1–2-character name queries are within budget at
  150k beers; the repeated figures are at the end of Evidence
- **Amended:** 2026-10-25 by [task 15](../tasks/iteration-8.5/15-catalog-reads-hold-at-imported-size.md)
  — the brewery list and brewery search are within budget at 150k beers once
  [ADR-0087](0087-the-brewery-list-is-cut-in-sql-by-a-stored-key-in-the-java-name-order.md)
  cuts their page in SQL, and `GET /styles` is measured and within budget; the
  figures are the last table in Evidence

## Context

Kalia has never had a read cache. The architecture's stance was that catalog
search stays under 300 ms server time on indexes alone, with no caching layer
until measurements demand one
([architecture.md §1](../architecture.md#non-functional-requirements)). That
stance was set against 54 seeded beers that never changed.

[Iteration 8](../tasks/iteration-8.md) removes both halves of that premise.
[ADR-0077](0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)
seeds about 13.6k beers and 4.9k breweries from Wikidata, and the add-a-beer
flow then grows the catalog with whatever users add.
[Task 04](../tasks/iteration-8/04-catalog-caching-decision.md) asks whether
that growth needs a cache. Its refinement fixed the test: catalog search and
beer detail are measured at the imported size and at a generated 150k
catalog, at 20 concurrent requests, with index use confirmed first. A cache
is warranted only if p95 server time breaks 300 ms at either size, and a
missing index is a finding rather than a reason to cache.

Three constraints shape what any cache could do. A beer a user adds is
visible to everyone at once (ADR-0077), so a cache must evict on write, not
expire on a timer. The design must not prevent horizontal scaling, which rules
out an in-process cache unless every instance evicts together. Catalog reads
are anonymous, so no cache key may depend on the user.

## Decision

**The catalog stays uncached: every catalog read that breaks the 300 ms
budget at 150k beers does so for want of an index or because of a defect
already recorded elsewhere, and [task 05](../tasks/iteration-8/05-cache-catalog-reads.md)
is dropped.**

The reads over budget at 150k, and where each one goes instead of a cache:

- **An unfiltered search page and a 1–2-character name query.** No index
  matches the default sort `lower(name), id`, so every such page sorts the
  whole table. A short pattern also yields no trigrams for the
  [ADR-0044](0044-catalog-search-indexes.md) index to use. Both go to
  [task 18](../tasks/iteration-8/18-catalog-search-served-by-an-index-at-150k.md).
- **A deep page.** Its cost is the `OFFSET`, and
  [task 08](../tasks/iteration-8/08-catalog-search-bounded-end-to-end.md)
  already bounds it.
- **The brewery list.** It loaded and sorted every brewery in Java
  ([ADR-0045](0045-brewery-list-paginates-in-application.md)). Quality
  backlog SHOULD-61 recorded this, and
  [ADR-0087](0087-the-brewery-list-is-cut-in-sql-by-a-stored-key-in-the-java-name-order.md)
  fixed it with a stored sort key and an index.

At the imported size, every read is within budget.

This covers the catalog's read endpoints only. It does not cover caching
anything else, or HTTP caching headers that serve another purpose.

**The question reopens** when either of these happens:

- The catalog passes 150k beers, the largest size measured.
- A repeat of the method in
  [architecture.md §7](../architecture.md#catalog-read-latency) shows a
  catalog read over 300 ms p95 that no index can serve.

A cache adopted then still has to meet the three constraints above.
[Task 04](../tasks/iteration-8/04-catalog-caching-decision.md)'s refinement
fixed two further defaults that a later cache inherits:

- An outage of the cache falls through to the database.
- Hits and misses are exposed through Actuator.

## Alternatives considered

**Adopt a cache now, reading the threshold literally.** Four reads break 300
ms p95 at 150k, and the refinement named that as the condition for a cache. It
was rejected for three reasons:

- **The threshold was a necessary condition, and a missing index was
  excluded.** Refinement wrote "warranted only if", and listed a missing index
  as a finding, not a cache. With an index on the sort, an unfiltered page
  falls from 357 ms to 28 ms. The experiment is in Evidence.
- **A cache would hide the slow reads only on a hit.** Evict-on-write means
  any added beer could land on any search page, so every write empties every
  cached search. A miss still runs the query that breaks the budget.
  Short-pattern and unfiltered searches have small key spaces and would hit
  often, but only between writes. Beer detail, the one read a cache could
  evict precisely, is already 3–4 ms.
- **A cache costs more than the fix.** A shared store is a new backend
  dependency, with an outage path and invalidation wiring. An in-process store
  breaks horizontal scaling. The index is one migration.

The candidate layers, so that a later reopening starts from them:

- **A backend read cache** in front of `CatalogService`.
- **HTTP `Cache-Control`/`ETag`.** A `max-age` cannot meet evict-on-write. An
  `ETag` saves only the transfer unless it is derived from a catalog-wide
  version.
- **Next.js data caching in the BFF.** It evicts by tag on the BFF's own
  writes but misses writes that reach the API another way, and it is
  per-instance unless it uses a shared cache handler.

The candidate providers:

- **An in-process cache.** Every instance needs to evict together.
- **The frontend's Valkey.** It is
  [ADR-0025](0025-authjs-valkey-adapter.md)'s session store, and it would
  become a backend dependency.
- **A store of the backend's own.** One more container in every environment.

**Measure only the imported size.** At 13.6k beers every read is under 75 ms,
which would have closed the question. Refinement rejected this before
measuring, because it says nothing about growth.

## Consequences

- Good, because the catalog keeps one source of truth on the read path:
  - no staleness to reason about;
  - no invalidation to wire to the add-a-beer write path;
  - no new dependency or container.
- Good, because the slow reads are fixed at their cause. A cache would have
  made them fast only on a hit, and left them unmeasured on a miss.
- Bad, because at 150k beers the catalog's landing page and short searches
  were over budget until task 18 landed, and the brewery list until ADR-0087.
  Today's 13.6k is far from that, but nothing but the reopen trigger above
  watches the size.
- Neutral, because the measurement is a recorded one-off, not a committed
  benchmark. Refinement rejected a load test as a new dependency.
  `BeerSearchIndexIT` stays the repeatable guard, and it guards plans, not
  latency. A regression that keeps the plans but loses the speed is caught
  only when someone repeats the method.
- **Revisit trigger:** the catalog passes 150k beers. Or a repeat of the
  method in [architecture.md §7](../architecture.md#catalog-read-latency)
  shows a read over 300 ms p95 that no index can serve. An index-served read
  over budget returns to task 18's shape of fix first.

## Evidence

Measured 2026-10-18 against `dev` at `8cbeb2d`.

**Environment:**

- **Database:** `postgres:18.4` with default settings, in Docker Desktop
  (10 CPUs, 16 GB), on an Apple-silicon Mac with 10 cores.
- **Backend:** the backend jar on the host under Temurin 25, with default
  settings (a HikariCP pool of 10).
- **Contention:** the machine was shared with other work, which accounts
  for the outlier ranges.

The method is in [architecture.md §7](../architecture.md#catalog-read-latency).
The figures are p95 server time from Tomcat's access log, as the median of
three runs with the range in brackets. Each run is 2,000 requests per
scenario from 20 concurrent clients, after 200 warm-up requests. Client-side
p95 agreed within 3 ms.

| Scenario | 13.6k imported | 150k generated | 150k + `(lower(name), id)` index, 1 run |
|---|---|---|---|
| Unfiltered page, default name sort | 42 [38–58] | **357** [350–569] | 28 |
| Unfiltered page, `sort=abv,desc` | 29 [23–33] | 228 [198–240] | 193 |
| Name query, 3+ characters | 9 [9–14] | 41 [41–65] | 41 |
| Name query, 1–2 characters | 63 [59–68] | **746** [661–1262] | **662** |
| Style filter | 12 [11–13] | 77 [73–85] | 29 |
| Country filter | 15 [14–16] | 101 [97–110] | 35 |
| Name + style + country | 4 [3–4] | 8 [7–10] | 7 |
| Beer detail | 3 [3–7] | 4 [4–29] | 3 |
| Page 500 (`OFFSET 10000`) | 71 [71–75] | **680** [666–1193] | 57 |
| Brewery list | 64 [62–67] | **886** [886–1709] | 885 |

The generated catalog held 150,000 beers and 54,054 breweries.

**Index use,** checked with `EXPLAIN (ANALYZE, BUFFERS)` on the SQL Hibernate
issues. Each filter used its ADR-0044 index at both sizes:

- `beer_name_trgm_idx` for 3+ characters;
- `beer_style_lower_idx`;
- `brewery_country_lower_idx` on the brewery side of a hash join.

Beer detail used `beer_pkey` and `brewery_pkey`.

Single-statement execution times at 150k:

- **Unfiltered page:** a parallel sequential scan with a top-N heapsort over
  150,000 rows, 76 ms.
- **`%a%`:** the same plan, 72 ms.
- **The experimental index on `(lower(name), id)`:**
  - the unfiltered page becomes an index scan, 0.4 ms;
  - `%a%` becomes an index scan, 0.1 ms;
  - `OFFSET 10000` becomes an index scan, 13 ms.

**Why short queries stay slow with the index.** The page is fast, but the
count is not. Its `lower(name) LIKE '%a%'` matches 106,270 rows. pgjdbc
switches to a server-prepared statement after five executions. Postgres's
generic plan for `LIKE $1` then picks the trigram index, which has no trigrams
to search on for a 1–2-character pattern and reads every entry. That costs
125 ms against 44 ms for the sequential scan that the custom plan chooses.

**Repeated 2026-10-24, with task 18's fix.** Same method and environment,
measured the same day before and after the change. "Before" is `dev` at
`0382b67`; "after" adds the `beer_lower_name_id_idx` B-tree on
`(lower(name), id)` and `plan_cache_mode = force_custom_plan` for a search
whose name term is 1–2 characters. Both ran against 150,000 beers and 54,054
breweries. The machine was busier than on 2026-10-18, with a load average of
13–15 on 10 cores from other work, so the ranges are wide. No request failed
in either column.

| Scenario | 150k before | 150k after |
|---|---|---|
| Unfiltered page, default name sort | **438** [340–924] | 28 [28–92] |
| Unfiltered page, `sort=abv,desc` | 242 [206–346] | 224 [214–308] |
| Name query, 3+ characters | 50 [45–57] | 28 [18–109] |
| Name query, 1–2 characters | **502** [501–524] | 144 [130–296] |
| Style filter | 60 [59–60] | 14 [12–15] |
| Country filter | 171 [149–174] | 48 [42–68] |
| Name + style + country | 48 [48–57] | 50 [48–122] |
| Beer detail | 4 [4–7] | 4 [3–13] |
| Page 500 (`OFFSET 10000`) | **735** [714–1911] | 54 [53–129] |
| Brewery list | **2474** [907–4133] | **1112** [872–1847] |

The `sort=abv,desc` "after" figure is from three runs of that scenario alone.
In the full pass, contention took it to 452 [206–586]. Nothing on its path
changed. The brewery list is still SHOULD-61's.

Plans at 150k after the change, from `EXPLAIN (ANALYZE, BUFFERS)`:

- **The unfiltered page** is an index scan on `beer_lower_name_id_idx`,
  0.3 ms, against 104 ms for the parallel sort before.
- **The country filter's page** walks the same index and stops at 20 rows,
  0.1 ms, against 55 ms.
- **The `%a%` count**, under a custom plan, is a parallel sequential scan,
  21 ms. The generic plan still reads every `beer_name_trgm_idx` entry, 72 ms.

**Why the custom plans are scoped to short terms.** Refinement worded the fix
as the search's whole transaction running `force_custom_plan`. Measured that
way, the short-term and unfiltered figures were the same, but
`sort=abv,desc` failed 757–920 of its 2,000 requests in each of three runs,
with Postgres reporting "could not resize shared memory segment … No space
left on device". Its generic plan, which it settles on once pgjdbc
server-prepares it, is a serial sort. Its custom plan, knowing the `LIMIT` is
20, is a parallel hash join, and 20 concurrent ones exhaust the 64 MB
`/dev/shm` a default Postgres container has. The product owner chose to force
custom plans only where the generic plan is the problem, the 1–2-character
name term, rather than raise `shm_size` in every environment.

**Repeated 2026-10-25, with the brewery list cut in SQL.** Same method, with
the brewery search and `GET /styles` added to the scenarios. Run against the
branch for [task 15](../tasks/iteration-8.5/15-catalog-reads-hold-at-imported-size.md)
on top of `dev` at `7168c66`, with `postgres:18.6` as `docker-compose.yml`
now pins it. The generated catalog held 149,677 beers and 54,054 breweries:
the generation step's clone gave the 13.6k imported beers ten copies, not the
exact 150,000 of the earlier runs. The machine had a load average of 4–7 on 10
cores from other work. No request failed.

| Scenario | 150k, 2026-10-24 | 150k, after ADR-0087 |
|---|---|---|
| Brewery list, page 0 | **1112** [872–1847] | 21 [21–34] |
| Brewery list, page 500 (`OFFSET 10000`) | not measured | 33 [27–34] |
| Brewery search, 1 character | not measured | 216 [190–223] |
| Brewery search, 2 characters | not measured | 175 [121–238] |
| Brewery search, 3+ characters | not measured | 17 [17–23] |
| `GET /styles` | not measured | 58 [53–58] |

Each search scenario rotated through six to eight terms. Plans at 54k
breweries, from `EXPLAIN (ANALYZE)` on the statements Hibernate issues:

- **The list page and a 1–2-character search page** walk
  `brewery_name_sort_key_idx` and stop at 20 rows, 0.04 ms. A search for a term
  that few names hold, `brasserie`, walks it past 1,595 non-matching rows,
  0.9 ms.
- **The count of a 1-character search** is the dearer statement. Under the
  generic plan pgjdbc settles on it is a bitmap scan of every
  `brewery_name_trgm_idx` entry, 48 ms; planned for its value it is a
  sequential scan, 19 ms. The beer search already forces the second for terms
  with no trigrams. The brewery search does not, because it is within budget as
  it stands; if the 1–2-character figures drift toward 300 ms, that is the
  first thing to try.
- **`GET /styles`** was not changed: 58 ms at 150k is within budget.
