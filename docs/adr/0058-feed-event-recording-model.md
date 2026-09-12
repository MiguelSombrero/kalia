# ADR-0058: Feed's event-recording model — an idempotent listener freezing an act's own facts, reading nothing live

- **Status:** accepted
- **Date:** 2026-09-12

## Context

[Iteration 7 task 01](../tasks/iteration-7/01-feed-module.md) is `feed`'s
first write path and the first real consumer of `cellar`'s `BottleAdded`
([ADR-0053](0053-cellar-domain-events-on-the-aggregate-root.md)) — the moment
Spring Modulith's at-least-once event-publication semantics
([architecture.md §3](../architecture.md#3-backend-modules)) stop being
theoretical. ADR-0053 fixed the mechanism (the aggregate root registers the
event, Spring Data drains it on `save`) and the outer shape of the payload
(ids and `occurredAt`, nothing mutable), but explicitly deferred the exact
field set and how a consumer copes with redelivery to this task. Two
questions had no existing answer: what makes processing the same event twice
safe, and what a `feed.line` row freezes versus reads live from elsewhere.

Task 01's own Constraints and "Decided" sections already settle the
product-facing shape — every addition recorded regardless of visibility, one
event per bulk add, quantity and vintage frozen forever, nothing re-read from
`cellar` once written. This ADR is the two structural choices under that
shape that a future editor could get wrong without seeing why: how the
listener stays safe to run twice, and why the event payload is shaped the way
it is.

## Decision

**`feed.FeedLine` is written by an idempotent `@ApplicationModuleListener`
keyed on a dedicated `BottleAdded.eventId`, and freezes only the facts
`cellar` hands it in the event — nothing is read back from `cellar` at write
time.**

- **`BottleAdded` carries its own `eventId` — a fresh `UUID` generated when
  `Entry.addBottles` registers the event — and `feed.line.event_id` is
  unique.** `FeedService.recordBottleAdded` checks `existsByEventId` before
  inserting. This is the idempotency key Spring Modulith's at-least-once
  redelivery needs: the same `BottleAdded` reaching the listener twice (a
  crash between the listener running and the publication registry marking
  the event complete) must produce one row, not two.
- **`entryId` is not in the event payload**, even though ADR-0053 mentions "the
  entry and bottle ids" as a general description. `Entry.addBottles` registers
  the event *before* `entries.save(entry)` runs; for a first-use entry (still
  transient) `id` is `null` until the JPA provider assigns it at persist, so
  capturing `entryId` at registration time would sometimes capture nothing.
  `eventId` already gives the event its own identity, and no consumer needs
  `entryId` yet — a later task adds it as a new field if one does, cheaper
  than carrying an id nothing reads.
- **`FeedLine` freezes `quantity` and `brewedDate` from the event payload and
  never re-reads `cellar`.** A feed line is a record of an act, not a view of
  a current holding (task 01's Constraints); `cellar` exposes no read API for
  a single bottle's current state across the module boundary, and resolving
  one at write time would race an in-flight edit or delete on the same
  bottle even if it did.
- **The listener is `@ApplicationModuleListener`, not a plain
  `@EventListener`.** It composes `@Async` + `@Transactional(REQUIRES_NEW)` +
  `@TransactionalEventListener` (Spring Modulith), so it runs after the
  publishing transaction commits and cannot fail or roll back the cellar
  write that raised it. This is the mechanism the acceptance criterion "a
  failure in feed does not fail the cellar addition" relies on — feed does
  not have to build resilience, it has to not remove the annotation that
  provides it.

## Alternatives considered

**Deduplicate on a natural key built from `(userId, beerId, occurredAt)`
instead of a dedicated event id.** Rejected: `occurredAt` is a JVM clock
reading (`Instant.now()`), not a guaranteed-unique value, and a natural key
built from business fields ties correctness to data that might legitimately
repeat — the same user adding the same beer within the same clock tick is not
impossible on a fast enough system, however unlikely.

**Catch the database's unique-constraint violation instead of checking
first**, the shape [ADR-0057](0057-retry-on-constraint-violation-for-get-or-create.md)
uses for a different race. Rejected: ADR-0057's problem is two *concurrent*
writers racing to create the same row. Spring Modulith's redelivery is
sequential retries of the same listener, not concurrent duplicate delivery —
there is no race here to protect against, so catching the exception only adds
a failed insert and a stack trace to the normal path that a plain
`existsByEventId` check avoids.

**Reload the entry via a `cellar` read to resolve current data at write
time.** Rejected: `cellar` exposes no such read across the module boundary,
and building one only for this would either reopen ADR-0053's payload
boundary or hand live data into a record whose whole point is to freeze it.

## Consequences

- Good, because idempotency is testable independently of timing — the check
  is a plain lookup, not a race a test has to provoke to exercise.
- Good, because nothing in `feed` depends on `cellar` beyond the event type
  (`fi.kalia.cellar.BottleAdded`): no repository, no domain type, matching
  [architecture.md §3](../architecture.md#3-backend-modules)'s cross-module
  read/write split.
- Neutral, because `feed.line` carries no `entry_id`; a future task that
  wants to link a feed line back to the entry it came from adds it as a new
  event field then, not now.
- Bad, because `FeedLine.brewedDate` becomes a second, independent copy of a
  fact `cellar.Bottle` also stores, and the two can read differently forever
  after a later edit to the bottle. That divergence is a design given
  (task 01's acceptance criteria require it), not a bug, but a reader of
  `feed.line` who has not seen this ADR could easily conclude it is one.
- **Revisit trigger:** the day a second event kind exists (task 01's
  non-goals), whether `FeedLine`'s frozen-fact columns generalize past
  `quantity`/`brewedDate` or need a per-kind shape is an open question this
  ADR does not answer.
