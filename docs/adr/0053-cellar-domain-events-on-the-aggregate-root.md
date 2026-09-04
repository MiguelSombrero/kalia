# ADR-0053: A cellar's domain events are registered on the aggregate root, not published from the service

- **Status:** accepted
- **Date:** 2026-09-04

## Context

[architecture.md §3](../architecture.md#3-backend-modules) has said since the
start that cross-module *writes* go through application events. Nothing has
ever published one. [Iteration 7 task 01](../tasks/iteration-7/01-feed-module.md)
is where that stops being theoretical: `cellar` will announce that someone
added a bottle and `feed` will consume it, and it is already carrying that
iteration's hardest question — what a feed may reveal about a private cellar —
so the mechanics of where an event comes from are pulled forward to here.

What the rule does not say is which object in `cellar` says the change
happened. Two answers, and they are not stylistic variants of each other:

- The **aggregate root** registers the event as part of the state change that
  caused it — Spring Data drains registered events when the root is passed to
  `save`. An event exists because the change did.
- The **application service** publishes the event itself, after the write. An
  event exists because someone remembered to publish it.

They differ in what happens when a future caller changes cellar state by a
path nobody has written yet, and they differ in their silent failure modes —
the part that matters, because an event that never fires produces no error
anywhere and no test necessarily notices.

This is also the first event, and the first event sets the shape every event
after it copies: what registers it, what it may carry, and what it is named.

## Decision

**A cellar domain event is registered on the aggregate root as part of the
state-changing method, and Spring Data drains it when the root is passed to
`save` (or `delete`). The application service never constructs or publishes a
domain event.** Bounding the decision:

- **Every aggregate root registers its own events — including a module whose
  aggregate is a single entity.** `cellar.Entry` registers `BottleAdded` inside
  `addBottles`; when `catalog` and the `profile` module from
  [task 01](../tasks/iteration-6/01-profile-and-visibility.md) gain their first
  events, `Beer`/`Brewery` and `Profile` register their own the same way. One
  rule, so the next module does not have to work out which kind it is.
- **An event carries ids and `occurredAt`, never a copy of anything that can
  change.** The user id, the entry and bottle ids, the beer id, and when it
  happened — facts about the event itself. A consumer reads current data back
  through `CatalogApi` and `ProfileApi`, so a cellar made private after the
  fact cannot be leaked by a stale copy in an old event. The exact field set and whether a bulk add of six bottles is
  one event or six are [iteration 7 task 01](../tasks/iteration-7/01-feed-module.md)'s
  (its open questions 2 and 3); this ADR fixes only that the payload is
  immutable references plus a timestamp.
- **Naming: `BottleAdded`.** Past participle on the thing whose state changed,
  never repeating the module name — the package already carries it
  (`fi.kalia.cellar.BottleAdded`). This yields `BottleRemoved` and
  `EntryEmptied` in `cellar`, and `CellarVisibilityChanged` in `profile`,
  without anyone deciding again. The rule is a vocabulary rule, so it also
  lands in [task 08](../tasks/iteration-6/08-ubiquitous-language-glossary.md)'s
  glossary as a term rule; the reasoning stays here and is linked, not copied.
- **The event type lives in the module's root package** — the inter-module API,
  the only part of a module a consumer may reference
  ([architecture.md §3](../architecture.md#3-backend-modules),
  [ADR-0007](0007-backend-package-structure.md)). `cellar.domain` referencing
  `fi.kalia.cellar.BottleAdded` is allowed: `ArchitectureTest`'s
  `domainDependsOnNoOuterLayer` forbids `domain` depending on `application` or
  `web`, and the root package is neither. `domain` already depends on Spring
  Data and Spring's `Assert` ([ADR-0007](0007-backend-package-structure.md)
  accepted both deliberately), so a root-package record and Spring Data's
  `AbstractAggregateRoot`/`@DomainEvents` support in `Entry` are not a new
  *kind* of dependency.
- **This depends on [ADR-0052](0052-cellar-aggregate-owns-its-writes.md)
  having landed — a hard dependency, not an assumption.** Spring Data drains
  an entity's registered events only when that entity is passed to `save` or
  `delete` on its repository. "The aggregate registers the event" publishes
  something only if every write path actually ends in `entries.save(entry)` /
  `entries.delete(entry)` on the root, which is exactly what ADR-0052 decided
  and enforced for every `CellarService` write path. ADR-0052 is `accepted`
  as of 2026-09-02; without it this rule would be correct on paper and publish
  nothing.
- **The proving test belongs to [iteration 7 task 01](../tasks/iteration-7/01-feed-module.md),
  not here.** That task must add an integration test that calls
  `CellarService.addBottles` on the real path — not `entries.save` directly —
  and asserts a `BottleAdded` reaches the event publication registry (Spring
  Modulith's `AssertablePublishedEvents` / `@ApplicationModuleTest`). A test
  that registers the event and saves in one step would pass even if a
  production caller skipped the save; the assertion has to run through
  `CellarService`.

No event is implemented and no production code ships in the task that produces
this ADR. [architecture.md §3](../architecture.md#3-backend-modules)'s
cross-module-writes line gains a pointer to this ADR; it is not rewritten.

## Alternatives considered

**The application service publishes the event after the write.**
`CellarService.addBottles` calls `entries.save(entry)` and then an injected
`ApplicationEventPublisher.publishEvent(new BottleAdded(...))`. Rejected for
its silent failure mode (below) and because it makes the event a thing a
caller opts into: every new method that changes cellar state, and every second
caller of an existing domain method, is another place that has to remember to
publish. The aggregate-root rule makes the event a property of the state
change instead — a write path added later cannot mutate a bottle without going
through `Entry` and `entries.save`, and the event rides along.

**Split the rule: aggregates with member entities register on the root,
single-entity aggregates publish from the service.** Rejected because it turns
on whether an entity has children *yet*. `profile.Profile` is a single entity
today; if it grows a child it would have to switch mechanisms, and until
someone notices, its events are the wrong shape. A rule that changes as a
module grows silently makes existing code wrong.

**Framework-free domain events, or a domain-layer publisher port.** Both were
raised in the same 2026-08-10 DDD review and both are already rejected for
this codebase by [ADR-0007](0007-backend-package-structure.md), which accepted
Spring Data inside `domain` deliberately. This ADR does not reopen that.

## Consequences

- Good, because the event cannot drift from the write: the DDD review's item 4
  concern — "an event exists because someone remembered" — is answered
  structurally. A future caller that changes cellar state through `Entry` and
  `entries.save` publishes the event whether or not its author was thinking
  about `feed`.
- Good, because the immutable-payload rule makes
  [iteration 7 task 01](../tasks/iteration-7/01-feed-module.md)'s hardest
  constraint — never leak a now-private cellar through a stale copy —
  structural rather than a rule a reader has to remember.
- Bad, because a consumer now fans out reads (`CatalogApi`, `ProfileApi`) to
  render one feed line, and must handle an id that points at something since
  removed — a bottle deleted, or a beer that cannot disappear today but one
  day might. This cost lands on `feed`, not on `cellar`.
- **Bad — the chosen option's silent failure mode:** a future write path
  mutates a managed `Entry` inside `CellarService`'s `@Transactional` method
  and returns *without* calling `entries.save(entry)`. JPA dirty checking
  flushes the state change at commit, so the row is correct and nothing errors
  — but the registered event is never drained and nothing is published. No
  test notices unless it asserts on the published event through the real
  service path. The mitigation is ADR-0052's rule that every write path ends
  in an explicit `save`/`delete` on the root, plus the proving test above; the
  failure mode is not eliminated, only guarded.
- **Neutral — the rejected option's silent failure mode, recorded for
  comparison:** with a service-side publisher, an event fails to fire when a
  new or modified method simply omits the `publishEvent` call, or when a
  second caller of a shared domain method never had one; it can also *over*-fire
  if the publish runs before a transaction that then rolls back. All silent.
  This is worse than the chosen option's failure, which needs someone to also
  violate ADR-0052 to occur.
- Neutral, because `EntryEmptied` versus a bare `BottleRemoved` on the
  last-bottle path (`CellarService.removeBottle` calls `entries.delete` there)
  is left to iteration 7 — Spring Data drains events on `delete` as well as
  `save`, so both mechanisms are available and the choice is about feed
  semantics, not plumbing.
- **Revisit trigger:** if a cellar write is ever needed that legitimately
  cannot route through `entries.save`/`delete` on the root — a bulk `UPDATE`
  for performance, say — the aggregate-root rule stops guaranteeing the event
  and this decision is reopened, most likely toward an explicit publish at
  that one call site with a test pinning it.

## Evidence

Spring Data Commons' `EventPublishingRepositoryProxyPostProcessor` publishes
the events returned by a `@DomainEvents`-annotated method (as provided by
`AbstractAggregateRoot.andEvent` / `registerEvent`) and then calls the
`@AfterDomainEventPublication` method to clear them, on `save`, `saveAll`,
`delete`, `deleteAll` and `deleteAllById`. It does **not** publish on a flush
triggered by dirty checking with no repository call — this is the documented
behaviour of Spring Data (Spring Boot 4.1 / Spring Modulith 2.1.1 on this
project) and the basis for the silent failure mode named in Consequences. It
was not re-measured for this ADR; no production code exercises it yet, and the
measurement belongs to
[iteration 7 task 01](../tasks/iteration-7/01-feed-module.md)'s proving test.
