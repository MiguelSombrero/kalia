# ADR-0103: A contributor is told what became of a suggestion by a notification that a new module keeps until they acknowledge it, and then deletes

- **Status:** accepted
- **Date:** 2026-11-05

## Context

A contributor who suggests a beer hears nothing back.
[ADR-0091](0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
records it as a consequence: a contributor who is never reviewed waits forever,
and nothing tells them. [Iteration 10.5](../tasks/iteration-10.5.md) gives a
review three outcomes — approved, rejected, and edited then approved — and
publishes one `SuggestionReviewed` event per decision, so the contributor can
now be told. The product owner's brief rules out the notice that vanishes on
its own: it stays until the contributor has acknowledged it.

Kalia has nothing shaped like that. The feed is a public record of cellar
activity, identical for every reader, not a per-user inbox
([ADR-0058](0058-feed-event-recording-model.md)). The web's toasts are
transient. What is built here is the first message Kalia keeps for one user,
and the backlog's likes and comments on feed events would reuse it, so its
shape is decided on purpose rather than left to the first task that needs it.

The forces are these. Events are delivered at least once and an incomplete
publication is resubmitted, so a notification written twice for one decision
is a real failure, not a theoretical one
([ADR-0081](0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)).
Every string a user reads is translated in two languages
([ADR-0011](0011-i18next-localization.md)), so text composed at write time in
one language cannot be shown in the other. The feed reaches an open browser by
polling ([ADR-0060](0060-feed-delivery-is-polling.md)), and a second polling
loop on every signed-in page is a cost to weigh. And a per-user row is one more
thing account deletion has to handle.

Decided with the product owner at refinement on 2026-11-04.

## Decision

**A new `notification` module keeps one notification per review decision for
the suggestion's contributor, written by an idempotent listener on
`SuggestionReviewed`, and deletes it when the contributor acknowledges it.**

- **The module owns per-user notifications and nothing else,** so the likes and
  comments in the backlog can write to it without `catalog` knowing. It
  depends on `catalog` for the event type alone, reads nothing from `catalog`
  or `identity` to write a row, and answers its own API to the signed-in
  caller, resolved through `identity` as every other module does
  ([ADR-0028](0028-resource-server-and-current-user.md)).
- **The source is `SuggestionReviewed`, and only it.** Removing an approved beer
  publishes its own event and notifies nobody
  ([task 02](../tasks/iteration-10.5/02-decision-what-reviewing-a-suggestion-does.md)).
  Every decision notifies its contributor, including a contributor who is also
  the admin who decided: there is no exception to remember.
- **The listener is keyed on the event's own `eventId`,** the way
  [ADR-0058](0058-feed-event-recording-model.md) keys the feed's, with a unique
  constraint on it: a redelivered event writes nothing. It is an
  `@ApplicationModuleListener`, so a failure here cannot undo the decision.
- **A notification freezes the facts of the decision when it is written:** the
  recipient, the outcome, the beer's id, the beer's name as decided, the name
  as suggested when the admin edited it, the reason code when the outcome is a
  rejection, and when the decision was made. It stores codes and names, never a
  sentence, and the client renders them in the reader's language. A later edit
  to the beer, or its removal, does not rewrite a notification already written.
- **"Read" means the contributor acknowledged that one notification,** an
  explicit act on it alone. Acknowledging deletes its row: no read flag, no read
  timestamp, no list of read notifications. Opening the list, or seeing the
  count, acknowledges nothing. An unacknowledged notification is therefore
  exactly a row that exists, and the unread count is the number of the caller's
  rows.
- **An unread notification never expires,** so retention is "until
  acknowledged". Nothing sweeps old rows.
- **A client learns there is something unread by reading the count,** a read
  the caller's own rows answer without returning the notifications. The web
  reads it once for each signed-in page render and runs no polling loop:
  decisions are rare, so a contributor with a page open sees a new one on their
  next navigation rather than the moment it is written. The list is paginated
  and its parameters bounded ([ADR-0042](0042-bounded-request-parameters.md)).
- **A caller can read and acknowledge only their own notifications.** Another
  user's is answered as one that does not exist, so the API does not confirm
  that it does.
- **An approval links to the beer's page; a rejection links nowhere** and states
  its reason. A rejection keeps the beer's id, but the page it names answers
  `404` for a withdrawn beer (ADR-0091), so the client decides from the outcome
  whether to link.
- **Deleting an account deletes its notifications,** as
  [task 15](../tasks/iteration-10.5/15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)
  decides; the deletion itself is not built here.

Implementing it is [task 09](../tasks/iteration-10.5/09-a-contributor-is-told-what-became-of-their-suggestion.md)
for the backend and [task 12](../tasks/iteration-10.5/12-design-the-contributors-notifications.md)
for the web. The mobile app shows none, push and email are not built, and the
API it would read is additive.

## Alternatives considered

**`catalog` answers "your decided suggestions."** Needs no new module and no
listener. Rejected: the acknowledgement would then live in `catalog`, a
suggestion's review record has a different lifetime from the message about it
(the record is kept when an account is deleted, the message is not), and a like
or a comment would have nowhere to go.

**A live reference to the review record or the beer, rendered when read.**
Keeps one copy of each fact. Rejected: an admin who later removes the beer, or a
name corrected afterwards, would rewrite what the contributor was told, and
every read would cross the module boundary that the event exists to avoid
([ADR-0058](0058-feed-event-recording-model.md) rejected the same for the feed).

**Composing the sentence when the notification is written.** Rejected: it is
stored in one language and shown in both, which
[ADR-0011](0011-i18next-localization.md) forbids.

**Opening the list marks everything read.** Rejected: a contributor who looks at
the page for any reason loses a notice they have not read.

**Keeping read notifications listed, with a read flag.** Would give a history.
Rejected: nothing asks for one, and it turns retention into a policy to choose
and a table that only grows.

**Expiring an unread notification after some period.** Rejected: the contributor
who was away for the period never learns what became of their beer, which is the
defect this decision closes.

**Polling the count, as the feed does** ([ADR-0060](0060-feed-delivery-is-polling.md)).
Rejected: a second loop on every signed-in page, for decisions that are rare.

**A toast, or a notice that dismisses itself.** Rejected by the brief: it cannot
promise the contributor has seen it.

**Writing it into the feed.** Rejected: the feed is public and identical for
every reader ([ADR-0058](0058-feed-event-recording-model.md)); a per-user message
does not belong in it, and the feed shows only cellar activity.

## Consequences

- Good, because a decision reaches its contributor, and a redelivered event,
  an edited beer or a removed one cannot change what was written.
- Good, because the next per-user message has a module to go in, and `catalog`
  stays unaware of who reads what it publishes.
- Good, because "unread" is the existence of a row: there is no state to drift
  and no query that has to filter on it.
- Bad, because an acknowledgement is final: there is no history, and a
  notification deleted by mistake is gone.
- Bad, because a contributor who never acknowledges leaves rows that nothing
  removes, and the unread count and list grow with them. Decisions are rare and
  suggestions are capped when pending, but decided ones are not capped.
- Bad, because a contributor with a page already open learns of a decision only
  on their next page render.
- Neutral, because what a notification holds is the review's facts. A second
  kind of notification adds its own, and whether they share one shape is left to
  the first task that needs it.
- Neutral, because the count is a read on every signed-in page render, one more
  call to a fast indexed lookup in that render.
- **Revisit trigger:** a second kind of notification; a need to see what was
  acknowledged, or to un-acknowledge one; a count too slow for every render; or
  unacknowledged rows piling up.
