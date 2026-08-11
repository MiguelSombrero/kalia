# Task 07: Where a cellar's domain events are registered

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

[architecture.md §3](../../architecture.md) has said since the start that
cross-module *writes* go through application events. Nothing has ever
published one. Iteration 7 [task 01](../iteration-7/01-feed-module.md) is
where that stops being theoretical: `cellar` will announce that someone added
a bottle, and `feed` will consume it.

What the rule does not say is which object in `cellar` is responsible for
saying it happened. There are two answers and they are not stylistic variants
of each other. The aggregate can register the event as part of the state
change that caused it, so an event exists because the change did; or the
application service can publish it after the write, so an event exists because
someone remembered to. They differ in what happens when a future caller
changes cellar state by a path nobody has written yet — and they differ in
their silent failure modes, which is the part that matters, because an event
that never fires produces no error anywhere.

It belongs before iteration 7's refinement rather than inside it. The first
event sets the shape every event after it copies, and iteration 7 task 01 is
already carrying the iteration's hardest question — what a feed may reveal
about a private cellar — without also carrying this one.

## Scope

Settling and recording where in a module an event is created, what it may
carry, and what guarantees the choice does and does not give. The output is a
decision that binds iteration 7 [task 01](../iteration-7/01-feed-module.md)
and every event after it.

No event is implemented and no production code ships.

## Non-goals

- The `feed` module itself, the event's payload fields, and whether an event
  is recorded at all for a private cellar — iteration 7
  [task 01](../iteration-7/01-feed-module.md), whose own open questions cover
  all three.
- Cross-module *reads*. `CatalogApi` and `IdentityApi` stay as they are;
  [architecture.md §3](../../architecture.md) already separates the two
  directions and only the write side is open.
- Retry, dead-lettering or republication policy for the Modulith event
  publication registry. That is an operational question, and it has no
  consumer until iteration 7 gives it one.

## Constraints

- Cross-module writes go through application events and reads through the
  root-package API ([architecture.md §3](../../architecture.md)). This task
  refines that rule; it does not replace it.
- Layer direction from [ADR-0007](../../adr/0007-backend-package-structure.md)
  holds: `cellar.domain` may not depend on `cellar.web`. Note for the
  decision, not an objection to it — `domain` already depends on Spring Data
  and on Spring's `Assert`, which ADR-0007 accepted deliberately, so putting
  Spring Data's event support in an entity is not a new *kind* of dependency.
- Spring Modulith's event publication registry uses the JDBC flavor and its
  table already exists in the `public` schema
  ([architecture.md §3](../../architecture.md)). Its delivery is at-least-once,
  so whatever is decided must be safe to deliver twice.
- **The decision has to survive
  [task 05](05-cellar-aggregate-owns-its-writes.md), or wait for it.** Spring
  Data publishes an entity's registered events when that entity is passed to
  `save` — so "the aggregate registers the event" is only true if writes
  actually go through a `save` on the root, which is exactly what task 05 is
  deciding. Getting this order wrong produces a rule that is correct on paper
  and silently publishes nothing.
- The output is an ADR following
  [template.md](../../adr/template.md), with the rejected option and its cost
  recorded ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)). It
  passes [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test
  because it binds every event the codebase will ever publish.

## Open questions

1. **Does the aggregate register the event, or the application service
   publish it?** The first ties the event to the state change; the second
   keeps entities free of the framework's event support and puts the decision
   where the transaction is already visible.
2. **If the aggregate registers it, what is the trigger — the state change or
   the `save`?** Spring Data drains `@DomainEvents` on a repository `save`, so
   an entity mutated inside a transaction and never explicitly saved publishes
   nothing while its change still persists by dirty checking. `updateBottle`
   is exactly that shape today. This is the silent failure the whole task
   exists to surface, and its answer may be a test rather than a rule.
3. **Does an event carry ids only, or a snapshot of what happened?** Ids mean
   `feed` reads back through `CatalogApi` and always sees current data; a
   snapshot means `feed` holds a copy that can go stale — which is the
   mechanism behind iteration 7 task 01's named privacy trap, arriving here
   first.
4. **Does the rule bind modules whose aggregate is a single entity with no
   members?** `catalog`, and whatever [task 01](01-profile-and-visibility.md)
   creates for profiles, have no root-and-members structure to hang an event
   on. Either the rule is about aggregates specifically, or it is about every
   entity, and the two read differently to whoever writes the next module.
5. **New ADR, or an amendment to
   [ADR-0002](../../adr/0002-spring-modulith.md) or
   [ADR-0007](../../adr/0007-backend-package-structure.md)?**
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) keeps decisions
   on one subject as separate documents, which argues for a new one; the
   product owner may read this as part of the Modulith decision instead.
6. **Should the rule say anything about event naming?** `BottleAddedToCellar`
   versus `CellarBottleAdded` versus `BottleAdded` is trivial in isolation and
   permanent once a second event copies the first — and it is a vocabulary
   question, so it may belong to
   [task 08](08-ubiquitous-language-glossary.md) instead.

## Acceptance criteria

- [ ] An ADR records where an event is registered, what it may carry, and what
      the rejected option would have cost; `node scripts/check-adrs.mjs`
      passes
- [ ] The ADR names the silent failure mode of *each* option — specifically,
      for each, the way an expected event fails to publish with nothing
      erroring and no test necessarily noticing
- [ ] The ADR states whether the rule depends on
      [task 05](05-cellar-aggregate-owns-its-writes.md) having landed, and if
      so says so as a dependency rather than an assumption
- [ ] `docs/architecture.md` §3's cross-module-writes line points at the ADR
      instead of standing alone
- [ ] Iteration 7 [task 01](../iteration-7/01-feed-module.md) has its
      Constraints rewritten against the decision before it is refined — a rule
      the task behind it does not reference is a rule that will not be
      followed
- [ ] The ADR names the test iteration 7 task 01 must write to prove an event
      actually fires on the path the rule describes, without writing it here

## Notes

Provenance: a Domain-Driven Design review of `backend/` on 2026-08-10, item 4
of its findings. The review's point was narrow: iteration 7 task 01 is still
`needs-refinement`, so this costs a conversation now and a migration later.

This task produces no production code and therefore **no new automated test**,
a deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task carries
one — the same exception, for the same reason, that iteration 8
[task 01](../iteration-8/01-catalog-data-source.md) takes. The rule exists to
stop behaviour shipping untested and there is no behaviour here; the tests
belong to iteration 7 task 01, which is why the last criterion above names
them rather than writing them.

If the product owner would rather not carry the exception, the alternative is
to fold this into iteration 7 task 01 as its first deliverable — rejected for
the reason in Why: that task already owns the iteration's hardest question.
