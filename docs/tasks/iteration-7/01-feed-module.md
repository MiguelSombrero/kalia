# Task 01: `feed` module and cellar events

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-1, DW-3

## Why

Kalia is meant to be social, and right now nothing one user does is visible to
another except by being sent a link. The [vision](../../../README.md) names the
feed as what makes the cellar social: adding a beer is news to people who care
about beer.

Nothing records that anything happened. A cellar knows its current contents and
not one thing about when or in what order they arrived, so there is nothing for
a feed to read even if a feed existed.

This is also the first cross-module write in the codebase, and
[architecture.md §3](../../architecture.md) has said since the start that those
go through application events. The rule has never been exercised.

## Scope

A `feed` module owning a record of things that happened, and the recording of
the first kind: someone added a bottle to their cellar. Its own schema and
migrations, and the event flow from `cellar` to `feed`.

## Non-goals

- Reading the feed over HTTP — [task 02](02-feed-api.md).
- Any UI — [task 03](03-front-page-feed.md).
- Event kinds other than a cellar addition. More will come; they are cheap to
  add once the shape exists and expensive to guess at now.
- Likes and comments — [backlog](../backlog.md).
- Deciding what a feed line may reveal about a cellar that is not public —
  [task 09](09-feed-and-private-cellars.md) settles that against
  [ADR-0050](../../adr/0050-public-cellar-addressing.md); this task stores
  whatever its answer needs.
- The reads that turn the ids in an event into a name a line can print —
  [task 04](04-feed-line-composition.md).

## Constraints

- `cellar` must not depend on `feed`. The write is a Spring Modulith
  application event ([architecture.md §3](../../architecture.md)); an event that
  `feed` consumes, published by `cellar` without knowing who listens.
- Module layout and dependency direction follow
  [ADR-0007](../../adr/0007-backend-package-structure.md); `ModularityTest`
  is the guard.
- One schema per module, migrations under the module's own Flyway location.
- Spring Modulith's event publication registry already exists in the `public`
  schema ([architecture.md §3](../../architecture.md)) — this is the first
  consumer, so its at-least-once semantics stop being theoretical, and whatever
  `feed` does on receipt must be safe to run twice for one event.
- **Where the event originates is already decided —
  [ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md).**
  This task does not choose it. `cellar.Entry` (the aggregate root) registers
  `BottleAdded` inside its state-changing method, and Spring Data drains it
  when `CellarService` calls `entries.save(entry)`; there is no service-side
  `ApplicationEventPublisher` call to add. This is a hard dependency on
  [ADR-0052](../../adr/0052-cellar-aggregate-owns-its-writes.md) too — every
  cellar write path ends in a `save`/`delete` on the root, which is what makes
  the registered event actually publish.
- **The event type is `fi.kalia.cellar.BottleAdded` in `cellar`'s root
  package** — the inter-module API, the only part of `cellar` this module may
  reference ([ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md),
  [ADR-0007](../../adr/0007-backend-package-structure.md)). Any further event
  kind this iteration needs is named the same way: past participle on the thing
  that changed, no module prefix (`BottleRemoved`, `EntryEmptied`).
- **The event carries ids and `occurredAt`, never a copy of anything that can
  change** ([ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)).
  So the privacy rule below is already structural on the `cellar` side — a
  stale visibility flag cannot be in the event because no mutable field is —
  and open question 2 is narrowed to *which* ids, not whether to copy names.
- **A feed event must never carry a cellar's privacy decision at the wrong
  moment.** Whatever this task stores in `feed`, visibility can change after
  the event is recorded; the reader must see the current answer, not the one
  that was true when the bottle was added. Getting this wrong leaks a cellar
  that was later made private, and it fails silently.
- **A new module's `domain` types need glossary rows in the same PR.**
  `scripts/check-glossary.mjs` fails CI when `fi.kalia.feed.domain` has types
  and [docs/glossary.md](../../glossary.md) has no table for them
  ([iteration 6 task 08](../iteration-6/08-ubiquitous-language-glossary.md)) —
  and `feed`, `event` and `activity` are exactly the words that already mean
  something else in this codebase (a Spring application event, an
  `event_publication` row), so the table is worth more here than the check
  costs.
- **The table is read newest-first and grows forever**, so the order it is
  read in is the order it is indexed on from the first migration. An
  unindexed feed degrades quietly as it fills rather than failing;
  [task 06](06-feed-increments.md) then depends on that order being total,
  which a timestamp alone is not.
- **Prove the event actually fires on the real path.** An integration test
  calls `CellarService.addBottles` — not `entries.save` directly — and asserts
  a `BottleAdded` reaches the publication registry, via Spring Modulith's
  `AssertablePublishedEvents` / `@ApplicationModuleTest`. ADR-0053 names this
  test as this task's to write: a test that registers and saves in one step
  would pass even if a production caller skipped the save.

**Decided 2026-09-12 by the product owner.** The privacy half lives in
[task 09](09-feed-and-private-cellars.md)'s Constraints and is not restated
here ([ADR-0020](../../adr/0020-documentation-roles.md)); what follows is the
storage shape that falls out of it, and this section is its single home —
tasks [02](02-feed-api.md), [04](04-feed-line-composition.md) and
[06](06-feed-increments.md) point here.

- **Every addition is recorded, whatever the cellar's visibility** (question
  1, closed by [task 09](09-feed-and-private-cellars.md)). The read filters;
  the writer does not. Nothing about a cellar's privacy is consulted on the
  write path, so there is no consume-time check to get wrong and no window in
  which an addition is silently dropped because the owner flipped the switch a
  second later.
- **Nothing in this module reacts to a cellar's visibility changing, and that
  is deliberate.** A purge of an owner's rows on going private was decided in
  refinement and removed in review of that PR;
  [task 09](09-feed-and-private-cellars.md)'s Constraints hold the four reasons
  and this task does not restate them
  ([ADR-0020](../../adr/0020-documentation-roles.md)). The consequence here is
  that `feed` consumes exactly one event, `profile` gains no domain event yet,
  and **the read-time visibility filter in [task 02](02-feed-api.md) and
  [task 06](06-feed-increments.md) is the only thing standing between a private
  cellar and the front page.** A reviewer looking for a second safety net
  should find this bullet rather than assume one was forgotten.
- **The table therefore retains rows for cellars that are currently private** —
  never served, never assembled, retained. Accepted in
  [task 09](09-feed-and-private-cellars.md); named here because it is this
  task's schema that holds them, and because GDPR erasure
  ([backlog](../backlog.md)) will come back to it.
- **A feed line is a record of an act, not a view of a current holding**
  (questions 2, 4 and 5). `feed`'s own row **freezes the act's own facts** —
  the bottle count and the vintage — because those describe what happened, and
  it **reads current data back** for what other modules own: beer name and
  brewery through `CatalogApi`, username through `ProfileApi`
  ([task 04](04-feed-line-composition.md) builds both reads). So
  [ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)'s
  rule is honoured where it binds — the *`cellar` event* carries ids and
  `occurredAt` and nothing mutable — while `feed`'s own record may hold the two
  facts that are true of the event forever. **Deleting a bottle, or editing its
  brewed date afterwards, does not change or remove the line.** `feed`
  therefore gains no dependency on `cellar` beyond the event itself.
- **A bulk add is one event carrying a count** (question 3). One
  `POST /api/v1/cellar/bottles` creating six identical bottles is one
  `BottleAdded` and one feed line — "added 6 bottles of …" — not six. The bulk
  add is already one operation sharing one set of dates
  ([architecture.md §3](../../architecture.md)), so the grouping boundary is
  the operation and needs no read-time collapsing rule and no cursor that has
  to stay stable across one.
- **The stored event knows whose cellar it came from, queryably** (question 6).
  A per-user or followed-users feed stays an addition rather than a rewrite —
  nothing here builds fan-out or a follow model, and the read is the same
  global list for every caller ([task 02](02-feed-api.md)).
- **The ordering column is decided in [task 06](06-feed-increments.md)** and
  this task's first migration creates it and its index. Note the trap named
  there: a `BIGSERIAL` has the same silent-loss flaw as a timestamp, because
  ids are allocated at insert and become visible at commit. Whatever total
  order task 06 settles, the index exists from migration one — an unindexed
  feed degrades quietly as it fills rather than failing.

## Open questions

**None.**

## Acceptance criteria

- [ ] Adding a bottle to a cellar records a feed event, and `cellar` has no
      compile-time dependency on `feed` — `ModularityTest` is the verification
      for the second half
- [ ] The event is recorded through the application-event mechanism, and a
      failure in `feed` does not fail the cellar addition that triggered it —
      integration test with a failing consumer, confirmed to fail against a
      direct synchronous call
- [ ] Every addition is recorded regardless of the owner's cellar visibility —
      integration test adding a bottle to a private cellar and asserting the
      row exists, confirmed to fail against an implementation that consults
      visibility on the write path
- [ ] A bulk add of six identical bottles produces one event carrying a count
      of six, not six events — integration test through `CellarService`
- [ ] A bottle deleted, and a bottle's brewed date edited, after the event was
      recorded leave the stored line unchanged — integration test, since this
      is what "a record of an act" means and nothing else asserts it
- [ ] Flyway migration creates the `feed` schema and applies cleanly against an
      empty database — verified by the integration test suite migrating from
      scratch
- [ ] An ADR records the event-recording model and what was rejected, passing
      `node scripts/check-adrs.mjs`
- [ ] `mvn clean verify` is green

## Notes

**None.**
