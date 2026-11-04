# Task 03: Decide how a contributor is told what became of a suggestion

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-3, DW-4

## Why

A contributor who suggests a beer today hears nothing back.
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
names it as a consequence: "a contributor who is never reviewed waits forever,
and nothing tells them". Once an admin approves, rejects or edits a suggestion
([task 02](02-decision-what-reviewing-a-suggestion-does.md)), the contributor
should find out — and the product owner's brief rules out the toast that
vanishes on its own: the notification stays until the contributor has
acknowledged it.

Kalia has nothing like it. The feed is a public record of cellar activity, not
a per-user inbox ([ADR-0058](../../adr/0058-feed-event-recording-model.md));
the web's toasts are transient. Whatever is built here is the first per-user
message Kalia keeps, and the likes and comments in
[the backlog](../backlog.md) would reuse it, so its shape is worth deciding on
purpose.

## Scope

An ADR records which module keeps notifications, what one holds and from which
events it is written, what "read" means and how it is recorded, how a client
learns there is something unread, and how long a notification is kept.

## Non-goals

- Implementing it — [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md)
  for the backend, [task 12](12-design-the-contributors-notifications.md) for
  the web.
- What the notification looks like and where it sits on the page, which
  [task 12](12-design-the-contributors-notifications.md) chooses from built
  alternatives.
- Push notifications or email: push is parked for cost
  ([backlog](../backlog.md#mobile-client)), and no task asks for mail.
- Showing notifications in the mobile app; the API it reads is additive and
  a later mobile iteration can take it.

## Constraints

- Listeners are idempotent and keyed on the event's own id, and an incomplete
  publication is resubmitted
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md),
  [ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)):
  a notification written twice for one decision is a bug.
- The feed reaches an open browser by polling over a Server Action
  ([ADR-0060](../../adr/0060-feed-delivery-is-polling.md)); a second polling
  loop on every signed-in page is a cost to weigh, not a default.
- Every string a user reads is translated in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)), so text stored in one
  language at write time cannot be shown in the other.
- Per-user rows add to what account deletion has to handle;
  [task 15](15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)
  decides that strategy in this iteration, and the two should agree.
- `/api/v1` is additive only
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- The event a notification is written from is `SuggestionReviewed`
  ([task 02](02-decision-what-reviewing-a-suggestion-does.md)'s Constraints).

**Decided at refinement, 2026-11-04** (product owner):

- **A new `notification` module** keeps per-user notifications, written by an
  idempotent listener on `SuggestionReviewed`; the backlog's likes and
  comments would reuse it. `catalog` answering "your decided suggestions"
  was rejected.
- **A notification freezes its facts when written** — the outcome, the beer's
  id, its name as decided, the name as suggested when edited, and the reason
  code — and the client renders them in its own language. A later edit or
  removal does not rewrite it. A live reference was rejected.
- **Each notification is acknowledged on its own; an acknowledged one
  disappears and its row is deleted,** and an unread one never expires — so
  retention is "until acknowledged". Opening the list marking everything read,
  and keeping read ones listed, were rejected.
- **The web reads the unread count once per signed-in page render,** with no
  polling loop: decisions are rare, and a second loop
  ([ADR-0060](../../adr/0060-feed-delivery-is-polling.md)) costs every page.
- **An approval links to the beer's page; a rejection links nowhere** and
  states its reason.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records the owning module, the notification's content and source
      events, what "read" means, how unread ones are discovered, retention,
      and the rejected alternatives, and passes `node scripts/check-adrs.mjs`
- [ ] Each test the decision implies — one notification per decision under a
      redelivered event, a notification acknowledged and gone, another user
      unable to read or acknowledge it — is named in the acceptance criteria of
      [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md)
      before it is refined

## Notes

Provenance: the product owner's brief for iteration 10.5 — a notification that
"goes away only if the user checks it". A decision task, so it adds no
automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
