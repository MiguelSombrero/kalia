# Task 04: Decide whether and how the catalog is cached

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

Kalia has no read cache, on purpose: catalog search should stay under 300 ms
server time on indexes alone, with "no caching layer until measurements demand
it" ([architecture.md §1](../../architecture.md#non-functional-requirements),
[§8](../../architecture.md#8-trade-offs-made-explicit)). That stance was
measured against a catalog of ~50–100 seeded beers that never changed.

This iteration removes both halves of that premise. Depending on what
[task 01](01-catalog-data-source.md) decides, the catalog becomes a large
imported dataset, a live external API with rate limits and its own outages, or
a table that grows with every user. Any of the three can move catalog reads
from "plenty fast" to "needs help", and the external-API model may need a cache
for availability no matter how fast it is.

The stance said *measure first*, and the iteration that changes the catalog's
size and source is the moment to do it, before users notice, rather than
whenever someone does.

## Scope

Measuring catalog reads against the catalog task 01's decision implies, and
recording the verdict either way: if caching is warranted, which layers, what
is cached, how stale a read may be, how entries are invalidated and which
provider; if it is not, the measurement and the threshold that would reopen the
question.

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
  done.** What is measured, and whether an external source needs shielding,
  both depend on its answer.
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

## Open questions

1. **What does "measurements demand it" mean in numbers?** The budget is
   <300 ms server time. At what catalog size, what concurrency, and against
   which data — generated rows, or task 01's actual source?
2. **Is the measurement a committed, repeatable benchmark or a one-off recorded
   in the decision?** A committed benchmark lets the "until measured" condition
   be checked again later, and may itself be a new dependency.
3. **Which layers, if any?** A backend read cache over catalog search and
   detail; a cache in front of an external source, only if task 01 picks one;
   HTTP `Cache-Control`/`ETag` on the public catalog endpoints; Next.js data
   caching in the BFF. Each has its own invalidation story, and caching at two
   layers multiplies the ways a read can be stale.
4. **How stale may a catalog read be?** [Task 02](02-add-beer-api.md) requires
   a created beer to appear in search immediately. Immediately for its creator
   only, or for everyone? The answer decides between evicting on write and
   simply expiring entries after a time.
5. **In-process or shared store?** In-process is simplest and diverges across
   instances. A shared store means the backend takes its first dependency on a
   key-value store, and raises whether it shares the frontend's Valkey or gets
   its own.
6. **What happens when the cache is unavailable?** Fall through to the
   database, or fail the read. For an external source, is a stale cached copy
   preferable to no catalog at all?
7. **How will anyone know the cache is earning its keep?** Hit and miss rates
   through Actuator are the obvious signal, and a cache nobody measures tends
   never to get removed.

## Acceptance criteria

- [ ] Catalog read latency is measured at the catalog size task 01's decision
      implies, and the method is written down well enough to repeat
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
[ADR-0026](../../adr/0026-task-file-format.md), for the same reason. If question
2 is answered with a committed benchmark, the benchmark becomes this task's
test and the exception falls away.

Seeded as a placeholder before refinement so that caching is weighed in the
iteration that changes the catalog, rather than discovered later.
