# ADR-0052: A bottle is written only through the entry that owns it, and a violated bottle rule is a cellar type from the start

- **Status:** accepted
- **Date:** 2026-09-02

## Context

[ADR-0034](0034-cellar-two-level-bottle-model.md) settled that `cellar.entry`
owns `cellar.bottle` rows and that quantity is always `COUNT(*)` over them.
Nothing enforced that ownership on the write path. Bottles were created,
updated and deleted against a `BottleRepository` directly from
`CellarService`, and a violated bottle rule (a future brewed date, a
non-positive bulk quantity) was raised inside the domain as
`IllegalArgumentException` and renamed to `InvalidBottleException` one layer
out, in the application service.

Both showed up as comments rather than as bugs. `Entry.removeBottle` carried a
nine-line warning that calling it did not actually delete the row;
`CellarService` carried three more explaining why removal called the aggregate
*and* the repository, why saving a new bottle through the entry returned a null
id, and why a `try` had to wrap exactly one call; two `try/catch` blocks
existed only to change an exception's type. The DDD review of `backend/` on
2026-08-10 (items 1 and 2) read those comments as the codebase pointing at
where the aggregate boundary was not being kept.

The question came up now because every task after this one adds another caller
built on the current shape: [iteration 6 task 02](../tasks/iteration-6/02-public-cellar-api.md)
adds a second reader of the cellar, and [iteration 7 task 01](../tasks/iteration-7/01-feed-module.md)
adds the first consumer of a cellar write event — and an event only fires if
the write goes through a `save` on the root.

## Decision

**A bottle is created, changed and removed only through its `Entry`, every
write path ends in `entries.save(entry)`, and a violated bottle rule is
thrown as `fi.kalia.cellar.domain.InvalidBottleException` from the domain
object that enforces it.** Concretely, and bounding the decision:

- `Bottle.create` and `Bottle.update` are package-private; only `Entry`
  constructs or mutates a bottle. `Entry` gains `addBottles`, `updateBottle`,
  `removeBottle` and `lastBottles`, and its `updatedAt` moves on every one of
  them.
- **There is no `BottleRepository`.** The by-id ownership lookup is a query on
  `EntryRepository` keyed on `(bottleId, userId)`, so "belongs to someone
  else" stays indistinguishable from "does not exist" as a property of the
  query rather than of a check that runs after loading
  ([architecture.md §4](../architecture.md#4-api-design)). This is enforced by
  a new `ArchitectureTest` rule — no Spring Data repository may be typed to an
  entity that a `@OneToMany` with orphan removal owns — checked against a
  fixture in `ArchitectureRulesRejectViolationsTest`, since no production
  class violates it.
- `InvalidBottleException` moves to `cellar.domain` and loses its
  `IllegalArgumentException` cause. `Entry.create`'s null-argument guards stay
  `IllegalArgumentException`: they are contract guards against a programming
  error, unreachable from an HTTP caller, not cellar rules.
  `CellarExceptionHandler` maps `InvalidBottleException` to the same 400 with
  the same message — the HTTP contract does not move.
- The removal path loads the entry's own bottle collection. Orphan removal
  cascades only from a collection Hibernate has initialised, and routing the
  delete through the aggregate root means loading the aggregate. An entry's
  bottle count is bounded (a bulk add is 1–24) and
  [architecture.md §3](../architecture.md#3-backend-modules) already calls a
  cellar "realistically far smaller than the catalog".
- **`cellar` only.** `catalog`'s `Beer.create` / `Brewery.create` keep their
  `Assert` → `IllegalArgumentException` shape until
  [iteration 8 task 02](../tasks/iteration-8/02-add-beer-api.md) gives them
  their first non-test caller.

[ADR-0007](0007-backend-package-structure.md) gains a pointer to this rule; it
is not rewritten.

## Alternatives considered

**A repository per entity — what existed.** `BottleRepository` alongside
`EntryRepository`, with `CellarService` orchestrating both. Rejected: it is
the structure the four comments in Why exist to explain. The aggregate root
stops being the write boundary, ownership becomes a check the service
remembers to run rather than a shape the query guarantees, and each new caller
is another place that has to get the orchestration right. The reason it was
wrong survives in neither the code that replaces it nor `architecture.md`,
which is [ADR-0032](0032-when-a-decision-earns-an-adr.md)'s test for an ADR.

**Keep `InvalidBottleException` in `application`, thrown by the domain.**
Rejected mechanically: `ArchitectureTest`'s `domainDependsOnNoOuterLayer`
forbids a `domain` class from referencing an `application` type, so a rule
raised inside `Entry` cannot throw one that lives there.

**Framework-free domain classes, or repository ports for the non-root
entity.** Both were raised in the same DDD review and both are already
rejected for this codebase by [ADR-0007](0007-backend-package-structure.md);
this ADR does not reopen them.

## Consequences

- Good, because the aggregate root is the write boundary in fact, not just in
  the data model: a future caller that changes cellar state goes through
  `Entry` and `entries.save`, so [iteration 7](../tasks/iteration-7/01-feed-module.md)'s
  event can be registered where the state changes.
- Good, because four of the longest comments in the backend, and two
  exception-renaming `try/catch` blocks, are gone — the structure no longer
  has anything to explain.
- Bad, because updating or removing one bottle now issues a second query to
  load the entry's bottle collection — the aggregate is loaded to be modified —
  where the old path fetched only the target bottle by id. Accepted against the
  bounded size of an entry, and it cost the `CellarServiceIT` test that pinned
  the old removal behaviour: deleted with this reason recorded rather than left
  asserting something no longer true.
- Neutral, because `CellarService` still names `InvalidBottleException`,
  `BottleNotFoundException` and the rest in its own package; the module's
  exception surface did not shrink, it moved.
- **Revisit trigger:** if an entry's bottle count stops being small — a user
  with hundreds of bottles of one beer — the load-to-remove cost is worth
  re-examining, most likely with a scoped delete that still routes through the
  root.

## Evidence

`CrudRepository.save` on an already-managed `Entry` runs through
`EntityManager.merge`. Hibernate 7 (Spring Boot 4.1) copies a still-transient
child in the merged collection into a fresh managed instance and persists
that; the reference the caller held keeps a null id even though a row was
inserted. Verified by `CellarServiceIT` failing on a null bottle id when
`addBottles` returned the list `Entry.addBottles` built. The fix is to return
the new bottles from the entry `entries.save(entry)` hands back —
`Entry.lastBottles(quantity)` — not from the pre-save list. `Entry.create` for
a first-use entry is left transient so its `save` is a `persist`, where the
same list is safe; the merge path only applies when a caller adds to an entry
that already exists.
