# ADR-0034: Cellar holds one row per bottle, quantity always derived — never a stored count

- **Status:** accepted
- **Date:** 2026-08-09
- **Amended:** 2026-09-02 by [ADR-0052](0052-cellar-aggregate-owns-its-writes.md) —
  the third evidence test below exercises removal through the `Entry` aggregate
  now that `BottleRepository` is gone; the invariant it pins is unchanged

## Context

Until 2026-08-08, `docs/architecture.md` specified the cellar as one table,
`cellar.cellar_item(user_id, beer_id, quantity, vintage_year, ...)` — one row
per (user, catalog beer), a stored integer count, and a single vintage year
for however many bottles that row represents. [Iteration 5 task
01](../tasks/iteration-5/01-cellar-module-and-schema.md) had to build the
actual schema and domain rules for a beer cellar, and settling this shape was
the task's real work, not a side detail of it.

A catalog beer is a brand — AleSmith IPA. What a person owns is a bottle of
it, with its own brewed and best-before dates. Two bottles of the same beer,
one brewed last month and one two years ago, are different things to the
person who owns both; a model that reports "AleSmith IPA × 2" and one vintage
year has thrown away the fact that makes cellaring a beer meaningful in the
first place, and cannot recover it without a migration once someone notices.

A second, narrower version of the same question surfaced during task 01's
refinement: even granting bottles as the unit, should bottles bought as one
case — same brewed date, same best-before date, same container — collapse
into a single row with a quantity, so that adding two dozen bottles is one
database row instead of two dozen? The product owner raised this directly,
reasoning that most users adding a case want one action, not two dozen forms.

## Decision

**The cellar is two levels — `cellar.entry` (one row per user × catalog beer)
owning `cellar.bottle` rows, each independently dated and independently
removable — and no table anywhere stores a quantity.** An entry's quantity is
always `COUNT(*)` over its bottles
(`fi.kalia.cellar.domain.Entry.quantity()`); removing a bottle changes what
that count returns without any column being written.

Adding many bottles at once — the "bought a case" scenario — is a bulk
*operation*, not a batch row: `CellarService.addBottles` creates that many
independent `cellar.bottle` rows in one call
(`fi.kalia.cellar.domain.Entry.addBottles`). The API cost of a case is one
request; the storage cost is still one row per bottle.

## Alternatives considered

**One row per (user, beer) with `quantity` and `vintage_year`** —
`architecture.md`'s shape before this ADR. Rejected: it cannot distinguish a
2024 bottle from a 2026 bottle of the same beer, which is the one fact a beer
cellar exists to keep. `vintage_year` is also strictly less precise than the
brewed/best-before dates the rest of this task settled on.

**A batch row with a stored `quantity`, for bottles sharing identical dates
and container type**, reconsidered specifically to cut the friction of
entering a case of 24. Rejected on inspection: bottles from one case turn out
not to be truly fungible even in the scenario that motivated the idea — one
bottle in a case can have a scratched label, differ in condition, or
eventually need its own photo, none of which a shared quantity can hold
without falling back to one row per bottle anyway. And a stored count next to
the rows it is meant to summarize is exactly the second-source-of-truth
problem the first alternative was already rejected for, reintroduced at
batch granularity instead of beer granularity — it would silently break the
moment one bottle from a batch is removed or edited on its own.

## Consequences

- Good, because an entry can always answer "which bottles, with which dates"
  exactly, as a property of the schema rather than a display convention layered
  on top of an approximation.
- Good, because removing a bottle, and any future per-bottle change (a
  condition note, eventually a photo), is a one-row operation that never has
  to keep a shared counter in sync.
- Bad, because adding many identical bottles produces that many rows — a case
  of 24 is 24 `cellar.bottle` rows, not one. Accepted as a bulk *operation*
  (one API call, N rows) rather than a batch row, so only storage cost grows
  with quantity, not the effort of adding it.
- Neutral, because this makes `cellar` the first Kalia module whose per-user
  storage scales with bottles rather than with distinct beers owned. Nothing
  about the app's scale today suggests that matters; worth remembering if
  per-user list rendering or storage ever becomes a question.
- **Revisit trigger:** if bulk-add's UX in [task
  13](../tasks/iteration-5/13-add-bottle-to-cellar.md) turns out to feel wrong
  even as one action — e.g. if rendering 24 rows is itself the complaint —
  that is a presentation-layer problem to solve at that layer, not a reason
  to reopen this schema decision.

## Evidence

The invariant is pinned by tests that would fail against a `quantity` column:
`EntryTest.removingABottleReducesQuantityWithoutAnyStoredCounter`,
`EntryTest.bulkAddCreatesThatManyIndependentRows`, and
`CellarPersistenceIT.removingABottleDeletesItsRowRatherThanLeavingItOrphaned`,
which asserts the row itself is gone rather than a counter having changed. The
third removes the bottle through the `Entry` aggregate since
[ADR-0052](0052-cellar-aggregate-owns-its-writes.md) — the assertion, that no
row survives, is the same.
