# Task 09: A contributor is told what became of their suggestion

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-3

## Why

After [task 06](06-an-admin-approves-or-rejects-a-suggestion.md) a decision
publishes an event, and nobody hears it. The contributor still finds out only
by noticing their beer in search, or not. This task gives the event its first
consumer: a notification kept for the contributor until they acknowledge it,
as [task 03](03-decision-how-a-contributor-is-notified.md) decided.

## Scope

Each approval, rejection and edited approval writes one notification for the
suggestion's contributor, once, however often the event is delivered. The API
lets a signed-in user read their own notifications and how many are unread,
and acknowledge them as
[ADR-0103](../../adr/0103-a-contributor-is-told-what-became-of-a-suggestion-by-a-notification-that-a-new-module-keeps-until-they-acknowledge-it-and-then-deletes.md)
decides; nobody can read or acknowledge another user's. Retention is applied as
the ADR decides.

## Non-goals

- The web's presentation — [task 12](12-design-the-contributors-notifications.md).
- Mobile, push or email ([task 03](03-decision-how-a-contributor-is-notified.md)'s
  non-goals).
- Notifications for anything but a review decision.
- Deleting an account, and so a redelivered event for a user already deleted:
  the module reads nothing from `identity` or `profile` to write a row
  (ADR-0103), so how such an event writes nothing is the deletion work's
  ([ADR-0104](../../adr/0104-deleting-an-account-deletes-what-is-the-users-own-unlinks-what-is-shared-and-leaves-a-tombstone-of-the-folded-username.md);
  [the backlog](../backlog.md) lists the test).

## Constraints

- Follows [task 06](06-an-admin-approves-or-rejects-a-suggestion.md), whose
  event it consumes, and [task 08](08-the-sql-moderation-script-is-retired.md),
  whose `BeerRemoved` one scenario publishes. It does not wait for
  [task 07](07-an-admin-edits-a-suggestion-before-approving-it.md): its
  scenarios publish `SuggestionReviewed` themselves, edited ones included.
- **The event is `fi.kalia.catalog.SuggestionReviewed` as task 06 shipped it**
  (the catalog module's root package, its inter-module API): `eventId`,
  `contributorId`, `beerId`, `outcome` (`APPROVED` or `REJECTED`), `beerName`
  (as decided), `edited`, `suggestedName` (present only when edited),
  `reason` (a `RejectionReason`, present only on a rejection) and
  `occurredAt`. A notification keeps these and nothing else — the recipient
  from `contributorId`, when it was decided from `occurredAt` — and the
  listener copies what arrives rather than recomputing it from a second read.
- **A notification's outcome is the review's three,** as ADR-0103's Context
  names them: approved, approved after an edit (`outcome` `APPROVED` with
  `edited`), rejected. `edited` is kept as the event says it, not derived
  from the two names: an edit of the style or ABV leaves the name as it was,
  and the notification must still say it was edited. Whether the event holds
  `suggestedName` when the name was unchanged is
  [task 07](07-an-admin-edits-a-suggestion-before-approving-it.md)'s to
  decide; the listener stores whatever arrives. ADR-0103 freezes the name
  alone, so an edit to anything else reaches the contributor as "edited" and
  the link to the beer's page (decided 2026-11-06, below).
- An idempotent `@ApplicationModuleListener` keyed on the event's own id
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md)); an incomplete
  publication is resubmitted
  ([ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)).
- A listener test polls the repository rather than verifying a spy's `save`,
  which races the listener's own commit (`backend/README.md`).
- The caller is resolved through `identity`, never from a request parameter
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)).
- Lists are paginated and parameters bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)); new paths are
  additive and in the committed spec
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- What account deletion does to a notification follows
  [task 15](15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)'s
  decision, [ADR-0104](../../adr/0104-deleting-an-account-deletes-what-is-the-users-own-unlinks-what-is-shared-and-leaves-a-tombstone-of-the-folded-username.md):
  it is deleted with the account, which is not built here, so the table is
  deletable by its recipient column from its first migration.
- The API serves what the notification froze, as codes and names and never a
  sentence ([ADR-0011](../../adr/0011-i18next-localization.md)), and never the
  recipient's id. Acknowledging a notification that is already gone — a
  second tab, a double press — answers `404`, as it does for one that never
  existed or is another user's, the way `DELETE /cellar/bottles/{id}` answers
  a bottle that is not the caller's; the web treats that `404` as "already
  gone" ([task 12](12-design-the-contributors-notifications.md)).
- The recipient column is indexed: the count is read on every signed-in page
  render (ADR-0103), and deleting an account deletes by it.
- The module, what a notification holds, acknowledgement, retention and the
  unread count are [task 03](03-decision-how-a-contributor-is-notified.md)'s
  decisions, recorded in its Constraints and in ADR-0103.

**Decided at refinement, 2026-11-06** (product owner; the second pass checked
this file against ADR-0103, ADR-0104 and the event task 06 shipped):

- **A notification keeps the name pair and an `edited` mark, nothing more of
  an edit.** Also freezing the style and ABV as suggested and decided, which
  would widen the event, was rejected: the contributor opens the beer's page
  for the rest.

## Open questions

**None.**

## Acceptance criteria

- [ ] An `@ApplicationModuleTest` scenario publishing `SuggestionReviewed`
      directly shows an approval, a rejection and an edited approval each
      writing one notification for the contributor, and a redelivered event
      writing none
- [ ] The same scenario shows a notification freezing the outcome, whether it
      was edited, the beer's id, the name as decided, the name as suggested
      when the event holds one, the reason code and when it was decided, a
      later edit or removal of the beer leaving it unchanged, and a
      `BeerRemoved` event writing none
- [ ] The same scenario shows a decision on the admin's own suggestion
      notifying the admin as contributor
- [ ] An integration test reads a user's notifications and unread count,
      acknowledges one, and the count falls; the count is read without the
      notifications, and the list is paginated and its parameters bounded; a
      response carries codes and names, no sentence and no recipient id
- [ ] An integration test shows another user can neither read nor acknowledge
      them, that acknowledging another user's, one already acknowledged and
      one that never existed are each answered `404` alike, and an anonymous
      caller is refused
- [ ] An acknowledged notification's row is deleted, and an unread one is kept
      whatever its age — test; opening the list leaves every notification
      unread
- [ ] A repository test deletes every notification for one recipient and
      leaves another recipient's, so the table can be emptied by user when an
      account is deleted ([task 15](15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)'s
      decision; the other tests it implies are named in
      [the backlog's](../backlog.md) GDPR item)
- [ ] The `notification` module passes `ModularityTest`, `ArchitectureTest` and
      `ArchitectureDocumentationTest`, and is in §3's table and §2's diagram
- [ ] The committed spec carries the operations, and the glossary the terms
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5. Closes the
consequence ADR-0091 records: "a contributor who is never reviewed waits
forever, and nothing tells them".
