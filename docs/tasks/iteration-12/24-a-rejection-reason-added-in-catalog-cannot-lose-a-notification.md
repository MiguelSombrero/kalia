# Task 24: A rejection reason added in catalog cannot lose a notification

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

The `notification` module persists `catalog`'s enum.
`notification/domain/Notification.java` maps `reason_code` as
`fi.kalia.catalog.RejectionReason`, and
`db/migration/notification/V010__notification_schema.sql` repeats the `CHECK`
list of `catalog`'s own migration. A fifth reason added in `catalog` looks
additive there, fails V010's `CHECK` when the notification listener writes it, is
retried five times
([ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md))
and is then lost: the contributor whose suggestion was rejected is never told.

The module already keeps its own copy of the outcome (`Notification.Outcome`,
mapped by name in `NotificationService`), because a notification is "frozen when
written"
([ADR-0103](../../adr/0103-a-contributor-is-told-what-became-of-a-suggestion-by-a-notification-that-a-new-module-keeps-until-they-acknowledge-it-and-then-deletes.md)).
The reason needs the same, and the failure is silent: nothing reports a
notification that was never stored. Tasks 04–17 give this iteration's users a
reason to look at what the app tells them, so a defect that makes it stay silent
is worth closing now.

## Scope

- The `notification` module owns the reason it stores and shows, mapped by name
  from the event the way the outcome is, with no `RejectionReason` import in its
  `domain` or `web` packages.
- A reason `catalog` publishes that the module has no copy of is stored and
  listed under its own name, rather than failing the write.
- A change to `catalog`'s reasons that the module has not caught up with fails a
  test, not a listener in production.

## Non-goals

- Changing which reasons exist or what the contributor reads for each.
- The mobile and web clients' handling of an unknown reason, which
  [iteration 11 task 18](../iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)
  already covers.
- A dead-letter store for events that fail every retry; that is ADR-0081's
  boundary.

## Constraints

- **Writes cross modules as events,** and `notification` already keeps its own
  copy of the outcome an event carries
  ([`docs/architecture.md`](../../architecture.md) §3); the reason follows the
  same pattern rather than a new one.
- **The API is additive only while an app is installed**
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
  `NotificationDto` exposes the reason today under `catalog`'s enum name; a
  module-owned type must keep the same values on the wire, and the
  breaking-diff check must pass.
- **Until the first deployment a change edits the migration it belongs to,**
  not a new one
  ([ADR-0036](../../adr/0036-pre-deployment-migration-edits.md)): the `CHECK`
  is changed in V010. The first deployment ends that; if it has happened by the
  time the task is built, the change is a new migration.
- A row is frozen when written, so a stored reason is never recomputed from
  `catalog`'s current list.

**Decided at refinement, 2026-11-22** (product owner):

- **The module stores the reason's name as text, with V010's `CHECK` removed,**
  frozen when written. A name it knows maps to its own reason, whose values are
  `catalog`'s today, so the spec's enum is unchanged. One it does not know is
  stored and listed as it came — reachable only past the mapping test below —
  and sent as that name, deliberately outside the spec's enum, which the
  clients' fallback for a value they do not know
  ([iteration 11 task 18](../iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md))
  exists for; ADR-0093's additive rule is unaffected, since no value is removed.
- **V010 is edited,** since Kalia has not been deployed (ADR-0036); the rows
  already stored need nothing else.
- **ADR-0103 gets an `Amended` line** for the module owning the reason it
  stores, rather than the package documentation alone.

## Open questions

**None.**

## Acceptance criteria

- [ ] A backend integration test publishes a `SuggestionReviewed` carrying a
      reason the notification module has no copy of and finds the notification
      stored and listed with the reason's name as it came. It failed before the change
- [ ] A unit test enumerates `RejectionReason.values()` and shows each has a
      mapping in the notification module, so a new reason fails here and not in a
      listener
- [ ] An ArchUnit rule or the existing module checks show `notification`'s
      `domain` and `web` packages importing nothing from `fi.kalia.catalog`
      other than the event
- [ ] The committed OpenAPI spec is unchanged on the wire, and the
      breaking-diff check passes
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-125.
