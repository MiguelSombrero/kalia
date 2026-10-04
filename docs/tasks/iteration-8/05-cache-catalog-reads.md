# Task 05: Cache catalog reads

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

If [task 04](04-catalog-caching-decision.md) finds that the growing catalog
needs a cache, someone has to build it. Building it is also where a correct
catalog can quietly become a wrong one. A cache's typical bug is not slowness
but staleness: the beer a user just added missing from search, or a corrected
ABV still showing the old value on another instance. None of these raise an
error; each one just shows a user the wrong thing.

## Scope

Building the caching task 04 decides for catalog reads, with invalidation wired
to every catalog write path and metrics that show whether the cache is earning
its keep.

## Non-goals

- Deciding the layer, the staleness tolerance or the provider. That is
  [task 04](04-catalog-caching-decision.md).
- Caching anything outside the catalog. That is task 04's non-goal too.
- Performance work the cache is not part of, such as indexes or query rewrites.

## Constraints

- **This task cannot be refined before [task 04](04-catalog-caching-decision.md)
  is done**, and is set to `dropped` if task 04 concludes "not yet". Its Scope
  and Open questions are placeholders, and task 04 rewrites them, or splits
  this task per layer, against the decision.
- It builds on [task 02](02-add-beer-api.md)'s write path, which must exist
  before invalidation can be wired to it.
- The existing catalog search and detail endpoints keep their contract.
- Controllers live in `catalog.web` and depend only on `catalog.application`
  ([ADR-0007](../../adr/0007-backend-package-structure.md)). Caching does not
  widen that boundary.
- A provider library or image is a new dependency: list it and ask for the
  version ([CLAUDE.md](../../../CLAUDE.md)).

## Open questions

Placeholder questions, to be replaced when task 04 lands.

1. **How is eviction triggered?** A direct call from the catalog's application
   service, or an application event that other modules' writes can also raise
   later.
2. **Is the cache enabled in tests?** Disabling it keeps tests deterministic and
   hides exactly the staleness bugs this task is most likely to introduce.
3. **Warm on start, or fill lazily?** Warming hides the first-request cost and
   lengthens startup.
4. **What does local development run?** If the provider is a shared store, does
   it join `docker-compose.yml`, and does `make verify` need it?

## Acceptance criteria

- [ ] With the cache enabled, a beer created through the add-a-beer API appears
      in search and at its detail endpoint on the very next read — integration
      test, confirmed to fail with eviction removed
- [ ] A repeated catalog read is served from the cache rather than the
      database — integration test
- [ ] Cache hits and misses are visible through Actuator metrics — integration
      test
- [ ] When the cache is unavailable, catalog reads behave as task 04 decided —
      integration test
- [ ] Task 04's measurement, repeated with the cache in place, shows the
      improvement the decision expected, and the numbers are in the PR
- [ ] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest` pass

## Notes

Seeded as a placeholder before refinement, alongside
[task 04](04-catalog-caching-decision.md), so that caching is not forgotten in
the iteration that changes the catalog's size and source.
