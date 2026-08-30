# Task 07: Where a cellar's domain events are registered

- **Status:** refined
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
- The output is a **new** ADR following
  [template.md](../../adr/template.md), with the rejected option and its cost
  recorded ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)). Not an
  amendment to [ADR-0002](../../adr/0002-spring-modulith.md), which decided
  whether to use Modulith at all rather than where an event originates —
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) keeps one subject
  in one document.
- **The aggregate root registers the event; Spring Data drains it on `save` of
  the root.** The event exists because the state change did, so a write path
  added later cannot change cellar state without one. This is a hard
  dependency on [task 05](05-cellar-aggregate-owns-its-writes.md), stated in
  the ADR as a dependency rather than an assumption: if writes do not go
  through a `save` on `Entry`, the rule is correct on paper and publishes
  nothing.
- **Every aggregate root registers its own events, including a module whose
  aggregate is a single entity** — `catalog`, and the `profile` module
  [task 01](01-profile-and-visibility.md) creates. One rule, so the next
  module does not have to work out which kind it is. The rejected split —
  "aggregates with members register, everything else publishes from the
  service" — turns on whether an entity has children *yet*, which changes as a
  module grows and silently makes existing code the wrong shape.
- **An event carries ids and `occurredAt`, never a copy of anything that can
  change.** The user id, the entry and bottle ids, the beer id, and when it
  happened — facts about the event itself. Consumers read back through
  `CatalogApi` and `ProfileApi`, so they always see current data, and a cellar
  made private after the fact cannot be leaked by a stale copy. This makes
  iteration 7 [task 01](../iteration-7/01-feed-module.md)'s hardest constraint
  structural instead of a rule someone has to remember; its cost is that a
  reader fans out reads and must handle an id pointing at something since
  removed.
- **Naming: `BottleAdded`** — past participle on the thing whose state
  changed, never repeating the module name, since the package already carries
  it (`fi.kalia.cellar.BottleAdded`). Gives `BottleRemoved`, `EntryEmptied`,
  and later `CellarVisibilityChanged` in `profile` without anyone deciding
  again. The rule is a vocabulary rule, so it also lands in
  [task 08](08-ubiquitous-language-glossary.md)'s glossary.
- **The event type lives in the module's root package**, which is the
  inter-module API and the only part of a module a consumer may reference
  ([architecture.md §3](../../architecture.md),
  [ADR-0007](../../adr/0007-backend-package-structure.md)). `cellar.domain`
  referencing it is allowed: `ArchitectureTest`'s `domainDependsOnNoOuterLayer`
  forbids `domain` depending on `application` and `web`, and the root package
  is neither.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records where an event is registered, what it may carry, and what
      the rejected option would have cost; `node scripts/check-adrs.mjs`
      passes
- [ ] The ADR names the silent failure mode of *each* option — specifically,
      for each, the way an expected event fails to publish with nothing
      erroring and no test necessarily noticing, including the chosen one's:
      an entity mutated inside a transaction and never explicitly saved
      persists by dirty checking and publishes nothing
- [ ] The ADR states the naming rule and what it yields for the events already
      foreseeable, and [task 08](08-ubiquitous-language-glossary.md)'s glossary
      carries it as a term rule rather than a second copy of the reasoning
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

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). The
decisions above are the ADR's content; writing it is still this task's work,
and the no-automated-test exception recorded above stands.
