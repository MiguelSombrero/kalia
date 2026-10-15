# Task 04: Decide whether and how the catalog is cached

- **Status:** refined
- **Iteration:** [8](../iteration-8.md)

## Why

Kalia has no read cache, on purpose: catalog search should stay under 300 ms
server time on indexes alone, with "no caching layer until measurements demand
it" ([architecture.md §1](../../architecture.md#non-functional-requirements),
[§8](../../architecture.md#8-trade-offs-made-explicit)). That stance was
measured against a catalog of ~50–100 seeded beers that never changed.

This iteration removes both halves of that premise.
[Task 01](01-catalog-data-source.md) decided that the catalog is seeded from
Wikidata, about 15k beers and thousands of breweries imported by
[task 17](17-seed-the-catalog-from-wikidata.md), and grows with every beer a
user adds. Nothing at runtime calls an external source, so there is no
availability case for a cache. The question is speed alone: whether a catalog
roughly 270 times larger moves catalog reads from "plenty fast" to "needs
help".

The stance said *measure first*, and the iteration that changes the catalog's
size and source is the moment to do it, before users notice, rather than
whenever someone does.

## Scope

Measuring catalog reads against the catalog task 01's decision implies, and
recording the verdict either way: if caching is warranted, which layers, what
is cached, how stale a read may be, how entries are invalidated and which
provider; if it is not, the measurement and the threshold that would reopen the
question.

If caching is warranted, the layers and the provider are not chosen here in
advance. The ADR lays out the candidates and their costs: a backend read cache,
HTTP `Cache-Control`/`ETag`, or Next.js data caching in the BFF, and an
in-process cache or a shared store (the frontend's Valkey, or its own). The
product owner picks.

## Non-goals

- Implementing a cache — [task 05](05-cache-catalog-reads.md) builds what this
  decides.
- Caching anything outside the catalog. Cellars, the feed and profiles are
  per-user or social data with different staleness and privacy stakes.
- The Valkey session store, which is the frontend's and settled
  ([ADR-0025](../../adr/0025-authjs-valkey-adapter.md)).
- Query and index tuning as a project of its own. If the measurement points at
  a missing index, that is a finding, not a cache.

## Constraints

- **This task cannot be refined before [task 01](01-catalog-data-source.md) is
  done.** What is measured depends on its answer, and the measurement runs
  against [task 17](17-seed-the-catalog-from-wikidata.md)'s imported catalog
  rather than generated rows.
- **"Not yet" is a valid outcome**, and the default one the architecture
  already commits to. If it is the answer, [task 05](05-cache-catalog-reads.md)
  is set to `dropped` rather than built anyway.
- The cache provider is a new dependency and the product owner's choice
  ([CLAUDE.md](../../../CLAUDE.md)). Name the candidates and what each costs;
  do not pick one.
- If caching is adopted, the output is an ADR following
  [template.md](../../adr/template.md) with the rejected layers and providers
  recorded ([ADR-0019](../../adr/0019-adr-format-and-conventions.md),
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).
- The design must not prevent horizontal scaling
  ([architecture.md §1](../../architecture.md#non-functional-requirements)).
  This rules out more than it looks like it does: an in-process cache behind
  two instances evicts on one and keeps serving the stale entry on the other,
  and nothing errors.
- Catalog reads are public and anonymous. Whatever is cached must not vary by
  user. A shared cache whose key misses a user-dependent part of the response
  serves one user's data to another, and fails silently.

**Decided at refinement, 2026-10-15** (product owner):

- **The threshold.** Catalog search and beer detail are measured at the
  imported size (about 15k beers) and at a generated catalog of 150k beers,
  which stands in for growth, at 20 concurrent requests. Indexes are first
  confirmed to be in use. A cache is warranted only if p95 server time breaks
  the 300 ms budget at either size. Whatever the verdict, the 150k result is
  recorded as the threshold that reopens the question. Measuring only the
  imported size was rejected, because it says nothing about growth.
- **A recorded one-off, not a committed benchmark.** The method is written
  into `docs/architecture.md` well enough to repeat. The existing planner
  integration tests, such as `BeerSearchIndexIT`, stay the committed,
  repeatable guard. A committed load test was rejected: it would be a new
  dependency, and one more thing to maintain.
- **How stale a read may be is already decided.** A beer a user adds is
  visible to everyone at once ([ADR-0077](../../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)),
  so a cache evicts on write. Expiring entries after a time cannot meet that.
- **Two defaults, if caching is adopted:** a cache outage falls through to the
  database rather than failing the read, and hits and misses are exposed
  through Actuator.

## Open questions

**None.**

## Acceptance criteria

- [ ] Catalog search and detail latency is measured at the imported size and
      at a generated 150k, at 20 concurrent requests, with index use
      confirmed. The p95 numbers and a method someone else can repeat are
      written down
- [ ] Either an ADR adopts caching (layers, what is cached, staleness,
      invalidation, provider, and the rejected alternatives) and passes
      `node scripts/check-adrs.mjs`; or `docs/architecture.md` records the
      measurement and the threshold that reopens the question, and
      [task 05](05-cache-catalog-reads.md) is set to `dropped`
- [ ] `docs/architecture.md` §1's latency row and §8's caching trade-off
      describe the outcome rather than the pre-iteration stance
- [ ] If caching is adopted, [task 05](05-cache-catalog-reads.md) has its Scope
      and Open questions rewritten against the decision before it is refined,
      split one task per layer if the decision spans more than one, and names
      the test that proves a newly added beer is never hidden by a stale entry

## Notes

Like [task 01](01-catalog-data-source.md), this task produces no production code
and so **no new automated test**. That is the same deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md), for the same reason. Refinement
chose a recorded one-off measurement over a committed benchmark, so the
exception stands.

Seeded as a placeholder before refinement so that caching is weighed in the
iteration that changes the catalog, rather than discovered later.
