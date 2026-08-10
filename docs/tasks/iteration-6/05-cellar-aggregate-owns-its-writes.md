# Task 05: The cellar aggregate owns its writes

- **Status:** needs-refinement
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

## Open questions

1. **What happens to `BottleRepository`?** Deleting it means the by-id
   ownership lookup behind `updateBottle` and `removeBottle` has to be
   expressed as a query returning the *entry* that owns a given bottle;
   narrowing it to the read path keeps a repository for a non-root entity,
   which is the thing being objected to, but keeps `listBottles` simple.
   Making it package-private in `domain` is a third answer that stops the
   application layer reaching it without deleting anything.
2. **One exception type for a violated cellar rule, or several?** Today
   `InvalidBottleException` covers every date and container-type rule at once,
   and `CellarExceptionHandler` maps it to a 400 carrying the message. Several
   types make the `ProblemDetail` distinguishable by the frontend and add a
   class per rule; one keeps the API exactly as it is.
3. **Does the type live in `domain` or stay in `application`?**
   [ADR-0007](../../adr/0007-backend-package-structure.md) puts "exceptions
   designed as API responses" in `application`, and every cellar exception is
   there now. A rule violated inside an entity is arguably a domain concept
   and belongs next to the rule; the cost is that a module's exceptions then
   live in two packages.
4. **Does `catalog` follow in the same PR?** `Beer.create` and
   `Brewery.create` use the same `Assert` → `IllegalArgumentException` shape.
   They are called from tests only today, and iteration 8
   [task 02](../iteration-8/02-add-beer-api.md) makes them live. Doing both
   now is one convention landing once; doing `catalog` later means the
   convention already exists when the module that needs it arrives.
5. **One PR or two?** The aggregate boundary and the exception typing are
   independent decisions that happen to touch the same four files. Splitting
   halves each review and rewrites `CellarService` twice.
6. **Is a no-behaviour-change refactor of this size wanted at all right now,
   or is it better placed after iteration 6 ships?** It is groundwork, not
   something a user sees, and the argument for doing it before
   [task 02](02-public-cellar-api.md) is that task 02 is another caller — the
   product owner may weigh that differently.

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
