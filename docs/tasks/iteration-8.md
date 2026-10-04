# Iteration 8 — Catalog beyond seed data

Goal: the catalog grows without a migration — people add the beers they cannot
find.

## Done when

A signed-in user who searches for a beer that is not in the catalog can add it
and immediately put a bottle of it in their cellar. Adding a beer that already
exists is caught rather than producing a second copy. Where the catalog's data
comes from in the long run is recorded as a decision rather than left open.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-8/01-catalog-data-source.md) | Decide where catalog data comes from | needs-refinement |
| [02](iteration-8/02-add-beer-api.md) | Add-a-beer API | needs-refinement |
| [03](iteration-8/03-add-beer-ui.md) | Adding a beer from search | needs-refinement |
| [04](iteration-8/04-catalog-caching-decision.md) | Decide whether and how the catalog is cached | needs-refinement |
| [05](iteration-8/05-cache-catalog-reads.md) | Cache catalog reads | needs-refinement |

Task 01 is a decision, not an implementation, and it comes first because its
answer changes how much tasks 02 and 03 have to build: a catalog fed by an
external API needs user contributions to reconcile against it, and one Kalia
owns outright does not.

Tasks 04 and 05 exist because that same answer changes the catalog's size and
source, which is what the architecture's "no cache until measured" stance was
waiting for. Task 04 measures and decides, and "not yet" is a valid answer that
drops task 05. Task 05 comes after task 02, since a cache that does not evict
on the new write path hides the very beer a user just added.

The catalog has been ~50–100 seeded beers since iteration 1. Every iteration
since has been built on the assumption that it never changes, which is the
assumption this iteration removes.
