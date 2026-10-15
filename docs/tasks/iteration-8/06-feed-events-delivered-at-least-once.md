# Task 06: Feed events are delivered at least once, as documented

- **Status:** refined
- **Iteration:** [8](../iteration-8.md)

## Why

The feed is documented as at-least-once and built as at-most-once.
`docs/architecture.md:229-231`, [ADR-0058](../../adr/0058-feed-event-recording-model.md)
and the comment in `FeedService.recordBottleAdded` all rely on Spring Modulith
redelivering a publication whose listener failed. Nothing configures that:
`application.properties` sets no `spring.modulith.events.*` key, so
`republish-outstanding-events-on-restart` keeps its `false` default, and
nothing in the code calls `IncompleteEventPublications`.

So one failed `FeedEventListener.on`, for example during a database hiccup,
loses that feed line for good. The `existsByEventId` idempotency guard defends
against a redelivery that never comes. Nobody sees an error, and a bottle that
was added simply never appears on the front page.

The registry also never shrinks. Under the default completion mode, every
completed publication stays in `event_publication` forever, so the table grows
with every bottle anyone adds.

(Quality backlog MUST-10.)

## Scope

A publication whose listener failed is delivered again, both after a restart
and while the application keeps running, and completed publications no longer
accumulate. The documentation's at-least-once claim becomes true rather than
being reworded.

## Non-goals

- Feed paging and what a page shows — [task 07](07-front-page-feed-reaches-public-lines.md).
- An event carrying a copy of mutable data. ADR-0053's wording against
  `BottleAdded`'s `brewedDate` is quality backlog SHOULD-41, a documentation
  amendment.
- Alerting infrastructure. Nothing to page anyone exists yet; logging is the
  limit here.

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**republish on restart, plus a scheduled resubmission of stale incomplete
publications, plus a completion mode that removes completed rows.** Rewording
the documentation to at-most-once was considered and rejected.

- The `existsByEventId` guard stays. Republishing makes duplicate delivery the
  normal case rather than a theoretical one, which is what the guard is for
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md)).
- New configuration keys follow
  [ADR-0015](../../adr/0015-configuration-strategy.md).
- The scheduled resubmission must not fire while the application is still
  starting, or it races the restart republish over the same rows.
- Listener tests must poll the repository rather than
  `verify(spy, timeout)`, which races the listener's own commit.

**Decided at refinement, 2026-10-15** (product owner):

- **Resubmission runs every 60 seconds** and resubmits publications that have
  been incomplete for more than 60 seconds. A listener takes milliseconds, so
  this never resubmits one that is still running, and a failed feed line
  arrives about two minutes late at worst.
- **Completion mode `DELETE`.** Nothing reads an archive, and `ARCHIVE` moves
  the unbounded growth into a second table rather than ending it.
- **A poison event stops after 5 attempts.** It is then logged at `ERROR`
  with its event id and left in the registry for inspection, not resubmitted
  forever. How attempts are counted is the implementation's choice.
- **The mechanism earns its own ADR**
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)), with
  rewording the documentation to at-most-once as the rejected alternative.
  [ADR-0058](../../adr/0058-feed-event-recording-model.md) gets an amendment
  that points to it, not a rewrite
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] A `BottleAdded` whose feed listener fails once is recorded as a feed
      line after resubmission, with no restart — integration test, confirmed
      to fail against today's configuration
- [ ] A publication left incomplete when the application stopped is delivered
      after the next start — integration test
- [ ] Redelivering an already-recorded event does not create a second feed
      line — integration test
- [ ] Completed publications are removed rather than accumulating in
      `event_publication` — integration test
- [ ] An event whose listener fails every time stops being resubmitted after
      5 attempts and is logged at `ERROR` with its event id — integration test
- [ ] A new ADR records the delivery mechanism. ADR-0058 is amended to point
      to it, and `docs/architecture.md` and the `FeedService` comment describe
      the configured mechanism. None still describes redelivery that does not
      exist, and `node scripts/check-adrs.mjs` passes
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-10, confirmed
2026-10-14. Its `[needs decision]` was settled while lifting it, as recorded
under Constraints.
