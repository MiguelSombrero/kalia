# Task 06: Feed events are delivered at least once, as documented

- **Status:** needs-refinement
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

## Open questions

1. **How often does resubmission run, and how old must a publication be?**
   Too short, and it resubmits a publication whose listener is still running;
   too long, and a feed line arrives minutes late.
2. **`DELETE` or `ARCHIVE` completion mode?** `ARCHIVE` keeps an audit trail
   in a second table that then grows without bound itself.
3. **What happens to an event that fails every time?** With unlimited
   resubmission, one poison event fails on every run, forever. Does it stop
   after N attempts, and what is logged when it does?
4. **Does this amend ADR-0058, or earn its own ADR?** ADR-0058 assumed
   redelivery without choosing a mechanism, and this task chooses one.

## Acceptance criteria

- [ ] A `BottleAdded` whose feed listener fails once is recorded as a feed
      line after resubmission, with no restart — integration test, confirmed
      to fail against today's configuration
- [ ] A publication left incomplete when the application stopped is delivered
      after the next start — integration test
- [ ] Redelivering an already-recorded event does not create a second feed
      line — integration test
- [ ] Completed publications are removed (or archived, per question 2) rather
      than accumulating in `event_publication` — integration test
- [ ] `docs/architecture.md`, ADR-0058 and the `FeedService` comment describe
      the configured mechanism, and none still describes redelivery that does
      not exist
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-10, confirmed
2026-10-14. Its `[needs decision]` was settled while lifting it, as recorded
under Constraints.
