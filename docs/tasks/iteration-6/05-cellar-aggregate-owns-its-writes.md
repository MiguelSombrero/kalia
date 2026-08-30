# Task 05: The cellar aggregate owns its writes

- **Status:** refined
- **Iteration:** [6](../iteration-6.md)

## Why

`cellar` models an entry that owns its bottles
([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)), but nothing
holds the write path to that ownership. Bottles are created, updated and
deleted against `BottleRepository` directly, and a violated bottle rule leaves
the domain as a plain `IllegalArgumentException` for the application layer to
catch and rename.

Both cost something already, and the cost is visible as comments rather than
as bugs. `Entry.removeBottle` carries a nine-line warning that calling it does
not actually delete the row; `CellarService.removeBottle` carries another
explaining why it calls the aggregate *and* the repository;
`CellarService.addBottle` a third explaining why saving through `entries`
would return a bottle with a null id; `CellarService.createBottle` a fourth
explaining why its `try` must wrap exactly one call. Four of the longest
comments in the backend describe mechanics that exist because writes go
around the root, and two `try/catch` blocks exist only to give an exception a
different name. [ADR-0017](../../adr/0017-code-comment-policy.md) says a
comment earns its place by holding what the repository cannot — these hold
what a different structure would not have to say.

Now, because the number of callers built on the current shape only goes up:
[task 02](02-public-cellar-api.md) adds a second reader of the cellar this
iteration, and iteration 7 [task 01](../iteration-7/01-feed-module.md) adds
the first thing that reacts to a cellar write. Each one is another caller to
move afterwards.

## Scope

Two changes to `cellar`, no change to anything a client can observe:

- A bottle is created, changed and removed only through the entry that owns
  it, so ownership of a bottle's lifecycle is a property of the model rather
  than of the service that happens to be calling.
- A violated cellar rule is a cellar type from the moment it is raised, not a
  generic exception renamed one layer out.

The HTTP contract, the JSON shapes and every status code stay exactly as they
are. This is a restructure, and the tests that already exist are the evidence
it changed nothing.

## Non-goals

- The read path. `EntrySummary`, `findSummariesByUserId` and the reads
  [task 02](02-public-cellar-api.md) adds are untouched; the aggregate rule
  being introduced is about writes.
- What an entry with no bottles is — [task 06](06-entry-with-no-bottles.md),
  which is a behaviour change and deliberately not mixed into a refactor whose
  whole safety argument is that behaviour did not move.
- Framework-free domain classes or repository ports.
  [ADR-0007](../../adr/0007-backend-package-structure.md) rejected both for
  this codebase and this task does not reopen them.
- `catalog` and `identity`, unless open question 4 says otherwise. Neither has
  an aggregate with members today.

## Constraints

- Layer structure and dependency direction stay as
  [ADR-0007](../../adr/0007-backend-package-structure.md) has them;
  `ArchitectureTest` is the guard and it must still pass.
- [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md) is accepted and
  frozen. Quantity stays derived by counting rows, no stored count appears
  anywhere, and the three tests that ADR names as its evidence
  (`EntryTest.removingABottleReducesQuantityWithoutAnyStoredCounter`,
  `EntryTest.bulkAddCreatesThatManyIndependentRows`,
  `CellarPersistenceIT.removingABottleDeletesItsRowRatherThanLeavingItOrphaned`)
  must pass unchanged.
- **The ownership check must stay indistinguishable from a missing row.** A
  bottle or entry belonging to someone else answers 404, never 403
  ([architecture.md §4](../../architecture.md)) — and the reason it does is
  that the query itself is keyed on the caller, not that a check runs after
  loading. Moving that lookup is the part of this task that can loosen a
  security property while every test still passes.
- **The Hibernate behaviour the current comments record was found
  empirically, not reasoned out.** Spring Data routes `save` on an
  already-managed entity through `merge`, which copies a transient child into
  a new instance; orphan removal does not cascade for a collection Hibernate
  has not initialized. `CellarServiceIT.removingABottleDoesNotLoadTheEntrysWholeBottleCollection`
  and `CellarServiceIT.removingABottleFromAnAlreadyLoadedCollectionIssuesOnlyOneDelete`
  pin both, by counting Hibernate statistics rather than asserting on results.
  A restructure either keeps those guarantees or proves they no longer apply —
  rediscovering them in review is the failure mode.
- The task produces an ADR. It passes
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test: a
  credible alternative (a repository per entity, which is what exists) is
  being rejected, and the reason would survive in neither the code nor
  `docs/architecture.md`. Accepted ADRs are amended rather than rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)), so ADR-0007
  gains a pointer, not a rewrite.
- Comments that the restructure makes unnecessary are deleted in the same PR.
  A comment kept because it looks careful, describing mechanics no longer
  reachable, is the drift [ADR-0017](../../adr/0017-code-comment-policy.md)
  exists to prevent.
- **One pull request**, covering the aggregate boundary and the exception
  typing together. They touch the same four files; splitting them rewrites
  `CellarService` twice and halves the context each review has.
- **`cellar` only.** `catalog`'s `Beer.create` / `Brewery.create` keep their
  `Assert` → `IllegalArgumentException` shape and adopt this convention in
  [iteration 8 task 02](../iteration-8/02-add-beer-api.md), when they gain
  their first non-test caller. The ADR records that as the plan, so it reads
  as a deferral rather than an oversight.
- **`BottleRepository` is deleted.** The by-id ownership lookup becomes a
  query on `EntryRepository` returning the entry that owns a given bottle
  *for a given user id* — so the ownership guarantee stays a property of the
  query, which is what the 404-not-403 constraint above actually protects. No
  repository survives for a non-root entity, which is why the ArchUnit rule
  below needs the fixture its acceptance criterion already anticipates.
- **One exception type for a violated cellar rule, and it lives in `domain`.**
  The package is forced, not chosen: `ArchitectureTest`'s
  `domainDependsOnNoOuterLayer` forbids an entity from referencing an
  `application` type, so a rule raised inside `Entry` cannot throw one.
  `InvalidBottleException` moves next to the rules that raise it and
  `CellarExceptionHandler` maps it to the same 400 with the same message —
  the HTTP contract does not move.
- **`Entry.updated_at` starts moving** when a bottle is added, edited or
  removed ([task 06](06-entry-with-no-bottles.md) decides what the column
  means). Routing writes through the root is what makes that natural, so it
  lands here rather than being retrofitted.
- The event support [task 07](07-cellar-domain-events.md) decides is built on
  this task: its rule is only true if writes go through a `save` on the root.
  Nothing about events is implemented here, but a restructure that leaves some
  write path persisting by dirty checking alone would make task 07's decision
  silently false.

## Open questions

**None.**

## Acceptance criteria

- [ ] `CellarApiIT` passes without a single edit — it asserts the HTTP
      contract independently of the internals being restructured, so an edit
      to it is a behaviour change that was not noticed
- [ ] ADR-0034's three named evidence tests pass unchanged
- [ ] An ArchUnit rule in `ArchitectureTest` fails the build when a bottle is
      written to from outside the aggregate that owns it, and it was confirmed
      to reject a violation — either against today's `CellarService` or, if
      nothing production would ever trigger it, against a fixture in
      `ArchitectureRulesRejectViolationsTest`, which exists because a rule
      nothing triggers passes whether or not its condition is right
- [ ] A unit test asserts that a violated bottle rule arrives at the caller as
      the module's own type, with no `IllegalArgumentException` caught
      anywhere in `cellar.application`
- [ ] No repository for `Bottle` remains anywhere in the tree — a grep finds
      none, and `mvn clean verify` is green without one
- [ ] Every write path ends in a `save` on the aggregate root rather than
      relying on dirty checking, so [task 07](07-cellar-domain-events.md)'s
      rule can hold — proven by a test that asserts the root is saved on the
      `updateBottle` path, the one shaped that way today
- [ ] An integration test still proves that removing one bottle neither loads
      the entry's whole collection nor issues two deletes — the two guarantees
      `CellarServiceIT`'s statistics-counting tests hold today. If the
      restructure makes either unreachable, the PR says which and why, and the
      test is deleted rather than left passing vacuously
- [ ] Ownership is still proven: a test confirms a bottle and an entry
      belonging to another user answer 404 and not 403, and it was confirmed
      to fail against an implementation that loads by id and checks afterwards
- [ ] `mvn clean verify` is green; `ArchitectureTest` and `ModularityTest`
      pass
- [ ] An ADR records the rule and what the rejected alternative would have
      cost, and `node scripts/check-adrs.mjs` passes; ADR-0007 gains a pointer
      to it rather than being rewritten
- [ ] Every comment the restructure makes unnecessary is gone, and each one
      kept is kept because the mechanics it describes are still reachable

## Notes

Provenance: a Domain-Driven Design review of `backend/` on 2026-08-10, items 1
and 2 of its findings. The review's argument for this task was not that the
current code is wrong — it works and it is tested — but that the four comments
named in Why are the codebase telling you where the boundary is not being
enforced.

The DDD review's other findings are [task 06](06-entry-with-no-bottles.md),
[task 07](07-cellar-domain-events.md) and
[task 08](08-ubiquitous-language-glossary.md). Its recommendations against —
framework-free domain classes and repository ports — are recorded in this
task's Non-goals so they do not come back as review comments.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). Question
6 — whether a no-behaviour-change refactor of this size is wanted before
iteration 6 ships — was put to the product owner and answered yes, now, for
the reason Why gives: every task after this one is another caller built on the
current shape.
