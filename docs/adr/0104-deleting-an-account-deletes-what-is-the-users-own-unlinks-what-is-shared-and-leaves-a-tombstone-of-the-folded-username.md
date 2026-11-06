# ADR-0104: Deleting an account deletes what is the user's own, unlinks what is shared, and leaves a tombstone of the folded username

- **Status:** accepted
- **Date:** 2026-11-05

## Context

Three accepted decisions keep a user's identifier forever, each sound alone. A
username is never reused
([ADR-0080](0080-a-username-is-unique-regardless-of-case-and-never-reused.md)),
so a profile row is never deleted. A contributed beer keeps its
`contributor_id`
([ADR-0091](0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
A feed line keeps its `user_id` ([ADR-0058](0058-feed-event-recording-model.md)).
Meanwhile [the backlog](../tasks/backlog.md) lists GDPR account deletion as
needed before any store release. Nothing yet says what deletion does to the
rows those decisions keep, so the day it lands it would have to unpick them.

[Iteration 10.5](../tasks/iteration-10.5.md) adds two more rows that name a
user: a review record that holds the admin who decided
([ADR-0102](0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)),
and a notification per contributor
([ADR-0103](0103-a-contributor-is-told-what-became-of-a-suggestion-by-a-notification-that-a-new-module-keeps-until-they-acknowledge-it-and-then-deletes.md)).
Deciding the strategy first lets those be shaped for it instead of reworked.

Two facts bound the answer. Identity is the Keycloak `sub`, which Kalia copies
into its own rows, and Keycloak holds the account's personal data
([ADR-0028](0028-resource-server-and-current-user.md),
[ADR-0049](0049-profile-module-and-public-identity.md)). And Kalia collects
no beer reviews, so what a user leaves behind is their cellar, their activity
in the feed, and the rows they added to the catalog everyone shares.

Decided with the product owner at refinement on 2026-11-04. This ADR records
the strategy only; deleting an account, exporting data and a consent flow are
not built.

## Decision

**Deleting an account deletes every row that is the user's own, removes the
user's id from every row that is shared and must stay, and keeps one thing
only: a tombstone holding the username's folded form, with no `sub`.** After
deletion, no row anywhere in Kalia's database can be traced to the person but
the reserved name.

The answer for each table that names a user, and what survives:

| Table | Names the user by | On deletion | What survives |
| --- | --- | --- | --- |
| `profile.profile` | `id` (the `sub`), `username` | replaced by a tombstone | `lower(username)` alone: no `sub`, no `cellar_public`, no timestamps |
| `cellar.entry`, and `cellar.bottle` through its cascade | `entry.user_id` | deleted | nothing |
| `feed.line` | `user_id` | deleted; the feed loses those lines | nothing |
| `catalog.beer`, `catalog.brewery` | `contributor_id` | row kept, `contributor_id` set to null | the row, with no contributor |
| `catalog.review` (ADR-0102) | the deciding admin's id, and the contributor's id where the record carries one | row kept, both ids set to null | the record and its beer's id |
| `notification` (ADR-0103) | the recipient's id | deleted | nothing |
| `event_publication` | the user's id inside `serialized_event` | a publication naming the user is deleted, completed or not | nothing |
| `appconfig.app_config` | nothing | untouched | the row |

- **The username stays reserved.** The tombstone keeps `lower(username)` in the
  same unique index that ADR-0080 defines, so a newcomer whose Keycloak
  username matches regardless of case still gets no profile and is told the
  name is taken. Its public cellar address answers `404`, since no cellar
  exists. The tombstone carries no `sub`: with nothing to join on, it names no
  one.
- **A cellar, its entries and their feed lines are the user's own and go with
  the account.** The feed loses those lines; no placeholder name stands in for
  the person. A reader of the feed never sees an account that no longer exists.
- **A catalog row is shared and stays.** A beer or brewery the user added is
  catalog data every user may hold, and no catalog row is ever deleted
  (ADR-0091); only the link to the person is removed, as
  [iteration 8 task 02](../tasks/iteration-8/02-add-beer-api.md) decided. A
  beer's other holders, and the `APPROVED` state it was reviewed into, are
  unaffected.
- **A review record is shared and stays.** It is the only trail of what an
  admin decided about a beer; with the contributor's and deciding admin's ids
  removed it says what was decided about a beer and when, and names no one.
- **A notification is the recipient's own and goes.** It is a message to one
  person; with the person gone there is no reader.
- **A suggestion still waiting when its contributor is deleted is rejected in
  the same transaction,** with no review record and no notification, since no
  admin decided and no one remains to tell. The review queue is derived from a
  `PENDING` beer *that has a contributor* (ADR-0102), so a pending beer with
  its link removed would drop out of the queue and answer `404` to an admin,
  and the duplicate key covers `PENDING` rows (ADR-0091), so it would block its
  name for ever. `REJECTED` is hidden, not deleted, and frees the name.
- **Each module changes only its own rows,** told of the deletion by an event
  ([architecture §3](../architecture.md#3-backend-modules),
  [ADR-0053](0053-cellar-domain-events-on-the-aggregate-root.md)). The event's
  name and delivery, the order of the modules and deleting the account in
  Keycloak belong to the deletion work. What this ADR fixes is the outcome:
  once a user is deleted, no module writes a row naming them, including a
  listener running a redelivered event
  ([ADR-0081](0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)).
- **The shape of the tombstone is left to the deletion work.** It may be the
  profile table with a nullable id, or a table of its own; either keeps the
  rule above. The rows that exist today need no migration to make this decision
  true, and new tables that name a user must be nullable or deletable by that
  column before they are built.

## Alternatives considered

**Keep the cellar, its entries and their feed lines under a placeholder name**
(a "deleted user" in the feed, a cellar nobody can open). Rejected by the
product owner: the lines are a record of one person's acts, and keeping them
under a placeholder keeps the one thing deletion exists to remove.

**Release the username on deletion.** Simplest, and nothing would be reserved.
Rejected by the product owner: a username is the address of a public cellar
(ADR-0050), and a reused one hands an old shared link to someone else, which is
the harm ADR-0080 prevents.

**Keep the tombstone with the `sub`**, so a person who deletes their account and
returns could be recognised and given their name back. Rejected: the `sub`
is the identifier that makes the row personal data, so the tombstone would keep
what deletion exists to remove. A returning person is a stranger, as ADR-0080
already treats a recreated Keycloak account.

**Delete the contributor's beers and breweries.** Removes every trace, but it
breaks ADR-0091 and the cellars of other users who hold them, which is the
cascade that decision rejected for an operator's removal.

**Keep a notification, with its recipient removed.** There is nothing in it for
anyone: a notification is addressed to one person, and without the address it is
a row no query reads.

**Pseudonymise the feed lines under a per-user random id** instead of deleting
them. Keeps the feed as a record, and a line could not be traced to a name.
Rejected: a stable id still groups one person's acts, and the lines carry what
was in their cellar.

## Consequences

- Good, because the strategy is fixed before the review record and the
  notification are built, so they are nullable or deletable by user from their
  first migration and not reworked when deletion lands.
- Good, because after deletion nothing in Kalia's tables names the person: the
  only survivor is a folded string with no key to the account.
- Good, because the person's old public address answers a refusal and never
  becomes someone else's.
- Bad, because the username is gone for good, even for the person who deleted
  the account: they cannot register the same name again, and Kalia cannot tell
  them from a stranger.
- Bad, because the feed loses lines other users may have seen, and a count
  of "bottles added" anywhere would fall; a feed line is a record that is not
  kept.
- Bad, because a deleted contributor's `APPROVED` beer stays in the catalog
  with no contributor, so a later correction cannot be sent to anyone, and an
  admin looking at it sees that it was a user's addition only from its
  `USER` source.
- Bad, because a suggestion rejected by deletion carries no review record, so
  the trail of why a beer was `REJECTED` is missing for it.
- Neutral, because a folded string is still a username, and in a small enough
  community it may identify someone. It is kept deliberately and only because
  reuse is worse.
- Neutral, because Keycloak holds the account's personal data and deleting it
  there is the deletion work's concern; this ADR covers Kalia's copy.
- **Revisit trigger:** Kalia holds personal data outside the tables above (crash
  reports, push tokens, a data export), or a requirement to release a username.
