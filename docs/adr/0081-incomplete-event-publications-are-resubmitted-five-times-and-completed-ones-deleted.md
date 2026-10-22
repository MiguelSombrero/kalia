# ADR-0081: Feed events were documented as at-least-once and delivered at most once, so incomplete publications are resubmitted, five attempts at most, and completed ones deleted

- **Status:** accepted
- **Date:** 2026-10-22

## Context

[docs/architecture.md](../architecture.md),
[ADR-0058](0058-feed-event-recording-model.md) and the comment on
`FeedService.recordBottleAdded` all describe Spring Modulith's event
publication registry as at-least-once: a `BottleAdded` whose feed listener
fails is delivered again, and the listener's `existsByEventId` guard absorbs
the duplicate. Nothing configured that redelivery. Modulith republishes
outstanding publications on restart only when a property asks it to, and
nothing in the code resubmitted them while the application ran. One failed
listener invocation, during a database hiccup say, lost that feed line for
good, silently.

The registry also never shrank. Under Modulith's default completion mode a
completed publication stays in `event_publication` with a completion date, so
the table grew by one row for every bottle anyone added.

The forces on the answer: Kalia runs one backend instance, and must not be
designed so a second one is impossible ([architecture.md
§1](../architecture.md)). No alerting exists to page anyone, so a log line is
as loud as a failure can be. And a listener can fail every time, which
unbounded retrying would turn into a permanent loop.
[Iteration 8 task 06](../tasks/iteration-8/06-feed-events-delivered-at-least-once.md)
records the product owner's choices among these.

## Decision

**A Spring Modulith event publication whose listener has not completed is
resubmitted by Kalia's own resubmission component: once at startup, then on a
60-second schedule once its latest attempt is more than 60 seconds old, up to
five attempts in all. A completed publication is deleted from
`event_publication` (completion mode `DELETE`).**

- **Startup resubmits every incomplete publication with attempts left,
  whatever its age.** It runs when the application's singletons are
  instantiated, the point Modulith's own restart republish uses, before the
  web server or the scheduler starts. Nothing can be in flight then. A row
  still marked `RESUBMITTED` is therefore one a crash interrupted, and it is
  reset to `FAILED` first, because Modulith claims a row for resubmission
  only when it is not already `RESUBMITTED`. Without the reset that row would
  never be delivered or reported.
- **The schedule fires first one interval after startup**, so it cannot race
  the startup resubmission over the same rows.
- **A publication's age is measured from its latest attempt**, not from when
  it was published. An attempt that began within the last minute is never
  claimed a second time, which keeps redelivery sequential, as ADR-0058's
  reasoning about the guard assumes, for any listener that finishes within a
  minute of being queued. Any incomplete status is eligible: `FAILED`, and also `PUBLISHED`
  or `PROCESSING` left behind when the listener committed but marking the
  publication complete then failed.
- **Attempts are Modulith's own `completion_attempts` count**, 1 when the
  event is published and one more per resubmission. A publication that reaches
  five is not resubmitted again by either path. It is logged at `ERROR` with
  its publication id once per application start, and stays in
  `event_publication` for a person to inspect. That line carries no stack
  trace, unlike the `ERROR` lines of
  [ADR-0013](0013-logging-conventions.md): no exception exists at that point.
  Each failed attempt was logged by Modulith as it happened, at `INFO`, with
  its message.
- **The `existsByEventId` guard stays.** Duplicate delivery is now an ordinary
  event rather than a theoretical one, and every listener added later must be
  idempotent the way feed's is ([ADR-0058](0058-feed-event-recording-model.md)).

## Alternatives considered

**Reword the documentation to at-most-once and configure nothing.** Rejected
by the product owner. A bottle that was added and never appears in the feed
is a silent product defect. The mechanism that prevents it is a small
component and four configuration keys.

**Modulith's `spring.modulith.events.republish-outstanding-events-on-restart`
for the startup half.** Rejected. It resubmits every incomplete publication
with no filter, so each restart would give an event that always fails one
more attempt, and the five-attempt cap would hold only between restarts. It
also leaves a row stranded in `RESUBMITTED` exactly where it was.

**Modulith's `FailedEventPublications.resubmit(ResubmissionOptions)` for the
scheduled half.** Rejected, for three reasons:

- It reads only `FAILED` rows, so it misses a publication left in
  `PROCESSING` after its completion could not be recorded.
- It reads a batch, 100 rows by default, oldest first, and applies the caller's
  filter after the limit. A hundred exhausted publications kept for
  inspection would fill every batch and starve every newer failure.
- Its JDBC query applies the minimum age to only one branch of an `OR`, so the
  age filter does not apply to `FAILED` rows at all (Evidence).

**Modulith's staleness monitor (`spring.modulith.events.staleness.*`) to
recover a row stranded in `RESUBMITTED`.** Rejected. It measures staleness
from the publication date, so it would flip a running resubmission of an old
publication to `FAILED`. Any status left unconfigured gets a zero duration,
which marks every row of that status failed, in-flight ones included. It also
logs at `INFO` on every check whether it finds anything or not.

**Completion mode `ARCHIVE`.** Rejected by the product owner. Nothing reads an
archive, and archiving moves the unbounded growth into a second table rather
than ending it.

**Reset stranded rows through Modulith's `EventPublicationRepository` rather
than SQL.** Rejected. The Modulith starter puts `spring-modulith-events-core`
on the runtime classpath only, so application code is meant to depend on the
events API, not on the store SPI. Taking a compile dependency on the SPI to
issue one `UPDATE` against a table Flyway already owns (`V002`) costs more
than it protects.

## Consequences

- Good, because the documentation's at-least-once claim is now true, with one
  named exception: a publication that has failed five times stays undelivered
  until someone acts on its `ERROR` line.
- Good, because `event_publication` now holds only incomplete publications. Its
  size is the delivery backlog rather than the history of every event.
- Bad, because duplicate delivery is now routine. A future listener written
  without an idempotency guard records its effect twice, and nothing but
  review stops that.
- Bad, because an exhausted publication needs a person. Nothing pages anyone,
  the `ERROR` line repeats once per restart, and recovery is a manual reset of
  its `completion_attempts` once the cause is fixed.
- Bad, because a listener that waits in the executor's queue for more than a
  minute can be resubmitted while its first delivery is still pending, and
  then run twice at once. The guard and `feed.line`'s unique `event_id`
  absorb it as one failed attempt.
- Bad, because the startup reset assumes one instance. A second instance
  starting would reset the first one's in-flight resubmissions and deliver
  them concurrently, which the guard tolerates but ADR-0058 does not assume.
- Neutral, because the component relies on Modulith's registry semantics
  (status values, the attempt count, and the claim that skips a row already
  `RESUBMITTED`). `FeedRedeliveryIT` and `FeedRedeliveryOnRestartIT` pin
  that behaviour, and a Modulith upgrade that changes it fails them.
- **Revisit trigger:** a second backend instance, alerting infrastructure that
  could route the `ERROR` line, or a Modulith release whose own resubmission
  covers the gaps above.

## Evidence

Spring Modulith 2.1.1, read from its sources jar on 2026-10-22:

- `PersistentApplicationEventMulticaster.afterSingletonsInstantiated` returns
  unless `republish-outstanding-events-on-restart` is `true`, and otherwise
  calls `resubmitIncompletePublications(__ -> true)`.
- `JdbcEventPublicationRepositoryV2` inserts a publication with
  `COMPLETION_ATTEMPTS = 1`. It claims one for resubmission with
  `UPDATE … SET STATUS = 'RESUBMITTED', COMPLETION_ATTEMPTS =
  COMPLETION_ATTEMPTS + 1, LAST_RESUBMISSION_DATE = ? WHERE ID = ? AND
  STATUS != 'RESUBMITTED'`, so a row already `RESUBMITTED` can never be
  claimed again.
- Its failed-publication query is `WHERE STATUS = 'FAILED' OR (STATUS IS NULL
  AND COMPLETION_DATE IS NULL)`, with `AND PUBLICATION_DATE < ?` appended
  after it. SQL binds that as `FAILED OR (… AND age)`.
- `CompletionMode.from` defaults to `UPDATE`.
- `StalenessProperties` defaults every status to `Duration.ZERO`, and
  `DefaultEventPublicationRegistry.markStalePublicationsFailed` marks failed
  every row of a status published before `now − staleness`.

Measured in this repository: `FeedRedeliveryIT`'s once-failing-listener test,
run against the configuration before this decision, recorded no feed line
within 15 seconds. With the startup reset removed, `FeedRedeliveryOnRestartIT`
fails: the interrupted publication is never delivered.
