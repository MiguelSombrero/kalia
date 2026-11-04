# Task 09: A contributor is told what became of their suggestion

- **Status:** needs-refinement
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
and acknowledge them as task 03 decided; nobody can read or acknowledge
another user's. Retention is applied as task 03 decided.

## Non-goals

- The web's presentation — [task 12](12-design-the-contributors-notifications.md).
- Mobile, push or email ([task 03](03-decision-how-a-contributor-is-notified.md)'s
  non-goals).
- Notifications for anything but a review decision.

## Constraints

- **This task cannot be refined before [task 03](03-decision-how-a-contributor-is-notified.md)
  is done**, and follows [task 06](06-an-admin-approves-or-rejects-a-suggestion.md),
  whose events it consumes.
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
  decision: it is deleted with the account, which is not built here.
- The module, what a notification holds, acknowledgement, retention and the
  unread count are [task 03](03-decision-how-a-contributor-is-notified.md)'s
  decisions, recorded in its Constraints.

## Open questions

Every question was answered at refinement on 2026-11-04, in task 03's
Constraints. The task moves to `refined` once task 03's ADR is accepted and
this file is checked against it.

## Acceptance criteria

- [ ] An `@ApplicationModuleTest` scenario shows an approval, a rejection and
      an edited approval each writing one notification for the contributor,
      and a redelivered event writing none
- [ ] An integration test reads a user's notifications and unread count,
      acknowledges one, and the count falls
- [ ] An integration test shows another user can neither read nor acknowledge
      them, and an anonymous caller is refused
- [ ] An acknowledged notification's row is deleted, and an unread one is kept
      whatever its age — test
- [ ] The `notification` module passes `ModularityTest`, `ArchitectureTest` and
      `ArchitectureDocumentationTest`, and is in §3's table and §2's diagram
- [ ] The committed spec carries the operations, and the glossary the terms
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5. Closes the
consequence ADR-0091 records: "a contributor who is never reviewed waits
forever, and nothing tells them".
