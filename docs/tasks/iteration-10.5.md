# Iteration 10.5 — An admin reviews what users add

Goal: an admin reviews the beers users suggest on a page of the web app —
approving, rejecting, or correcting and approving each — and the contributor
finds out what became of theirs, which replaces the SQL moderation script.

## Done when

- **DW-1:** A signed-in user with the admin role reaches an admin area of the
  web app that nobody else reaches or sees offered; a self-registered account
  never holds the role, and only the local stack seeds an admin account.
- **DW-2:** An admin approves, rejects, or edits and approves a suggestion — a
  beer, together with its brewery when that was new — through an admin API of
  its own and a page built on it, and `make moderate` is gone.
- **DW-3:** Each decision publishes one domain event per suggestion, whether or
  not its brewery was new, and the contributor sees a notification of it in the
  web app that stays until they acknowledge it.
- **DW-4:** Who is an admin, what a suggestion is and what reviewing it does,
  and how a contributor is notified are each a recorded decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| [14](iteration-10.5/14-the-committed-spec-lists-every-response-and-its-checks-hold.md) | The committed spec lists every response, and its own checks hold anywhere | done |
| [13](iteration-10.5/13-domain-time-from-the-clock-and-one-read-per-duplicate.md) | Domain timestamps come from the Clock, and a duplicate brewery is read once | done |
| [01](iteration-10.5/01-decision-who-is-an-admin.md) | Decide who is an admin, and how every tier knows it | done |
| [02](iteration-10.5/02-decision-what-reviewing-a-suggestion-does.md) | Decide what a suggestion is and what reviewing one does | done |
| [03](iteration-10.5/03-decision-how-a-contributor-is-notified.md) | Decide how a contributor is told what became of a suggestion | done |
| [15](iteration-10.5/15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md) | Decide what deleting an account does to what Kalia keeps forever | refined |
| [04](iteration-10.5/04-the-admin-role-exists-and-the-api-refuses-everyone-else.md) | The admin role exists, and the API refuses everyone else | done |
| [05](iteration-10.5/05-an-admin-reads-the-review-queue.md) | An admin reads the queue of suggestions waiting for review | done |
| [06](iteration-10.5/06-an-admin-approves-or-rejects-a-suggestion.md) | An admin approves or rejects a suggestion, and one event says so | refined |
| [07](iteration-10.5/07-an-admin-edits-a-suggestion-before-approving-it.md) | An admin edits a suggestion before approving it | refined |
| [08](iteration-10.5/08-the-sql-moderation-script-is-retired.md) | The SQL moderation script is retired, and an admin can remove an approved beer | refined |
| [09](iteration-10.5/09-a-contributor-is-told-what-became-of-their-suggestion.md) | A contributor is told what became of their suggestion | needs-refinement |
| [10](iteration-10.5/10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md) | The web keeps everyone but an admin out of the admin area | done |
| [16](iteration-10.5/16-the-backend-limit-holds-for-calls-the-web-makes.md) | The backend's request limit holds for the calls the web makes on a visitor's behalf | refined |
| [11](iteration-10.5/11-design-the-admin-review-page.md) | An admin reviews suggestions on a page of their own | needs-refinement |
| [20](iteration-10.5/20-an-admin-removes-an-approved-beer-from-its-page.md) | An admin removes an approved beer from its page | refined |
| [12](iteration-10.5/12-design-the-contributors-notifications.md) | A contributor sees what became of their suggestion until they have read it | needs-refinement |
| [17](iteration-10.5/17-an-empty-feed-polls-only-for-new-lines.md) | A feed that opened empty polls only for what is new | done |
| [18](iteration-10.5/18-a-cellar-write-reads-back-as-it-was-made.md) | A cellar write reads back as it was made, and a lost one says why | refined |
| [19](iteration-10.5/19-a-slow-keycloak-delays-one-call-not-every-call.md) | A slow Keycloak delays one call in the app, not every call | refined |

Numbered 10.5 for the reason [iteration 8.5](iteration-8.5.md) was: iteration
11 is already drafted, and this work lands before it. It is web-only — the
mobile app gains no admin surface and no notifications here — and it starts
once [iteration 10](iteration-10.md) is closed, because two of that
iteration's tasks settle the moderation rules this one builds on:
[task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
(a rejected or removed beer is withheld everywhere) and
[task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md) (what the
add dialog says, and the anonymous "already suggested" `409`).

Tasks 01–12 and 20 are the admin feature, from the product owner's brief, and
lift the [backlog](backlog.md)'s "Admin UI + role-based access for catalog
management" item together with SHOULD-80, COULD-81 and COULD-99 from the
[quality backlog](quality-backlog.md); SHOULD-80 and COULD-99 were returned
from iteration 10 to be fixed here. Refinement on 2026-11-04 added task 20 and
returned SHOULD-80's second half — rejections limiting further suggestions —
to the quality backlog. Tasks 13–19 fill the iteration from the
quality backlog, chosen by their impact on the product and merged where
findings touch the same code. Every task is seeded at `needs-refinement`, to
be refined together in one conversation
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)). The quality
tasks advance no `Done when` criterion and say so with `Covers: none`.

The table's order is the order of work:

- **First, the ground the admin API is built on.**
  [14](iteration-10.5/14-the-committed-spec-lists-every-response-and-its-checks-hold.md)
  closes the spec's gaps before the admin API adds body-taking operations that
  would inherit them, and
  [13](iteration-10.5/13-domain-time-from-the-clock-and-one-read-per-duplicate.md)
  moves `Beer` and `Brewery` onto the `Clock` and makes the duplicate-brewery
  check one read, before review timestamps and the edit path copy either.
- **Then the four decisions.** [01](iteration-10.5/01-decision-who-is-an-admin.md),
  [02](iteration-10.5/02-decision-what-reviewing-a-suggestion-does.md) and
  [03](iteration-10.5/03-decision-how-a-contributor-is-notified.md) are the
  feature's; [15](iteration-10.5/15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)
  is the quality backlog's, placed here because this iteration adds two new
  kinds of row that name a user. Each ADR is accepted before the tasks it binds
  are refined, as in iterations 9 and 10, so those tasks carry a short second
  refinement pass: their questions were answered on 2026-11-04, and that pass
  checks each file against its ADR.
- **Then the backend, in the order each depends on the last:** the role
  ([04](iteration-10.5/04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)),
  the queue ([05](iteration-10.5/05-an-admin-reads-the-review-queue.md)),
  approving and rejecting ([06](iteration-10.5/06-an-admin-approves-or-rejects-a-suggestion.md)),
  editing ([07](iteration-10.5/07-an-admin-edits-a-suggestion-before-approving-it.md)),
  retiring the script once nothing needs it
  ([08](iteration-10.5/08-the-sql-moderation-script-is-retired.md)), and the
  notifications the events feed
  ([09](iteration-10.5/09-a-contributor-is-told-what-became-of-their-suggestion.md)).
- **Then the web:** the admin area's guard
  ([10](iteration-10.5/10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)),
  the backend bound on calls made through the web
  ([16](iteration-10.5/16-the-backend-limit-holds-for-calls-the-web-makes.md))
  before the pages add Server Actions that change data, the two design
  tasks — the review page
  ([11](iteration-10.5/11-design-the-admin-review-page.md)) and the
  contributor's notifications
  ([12](iteration-10.5/12-design-the-contributors-notifications.md)), whose
  Playwright journey covers the iteration end to end — and, between them,
  removing an approved beer from its page
  ([20](iteration-10.5/20-an-admin-removes-an-approved-beer-from-its-page.md)),
  an ordinary task: one action and one confirmation leave nothing to choose
  between built alternatives.
- **Last, quality work on other surfaces:** the empty feed's poll
  ([17](iteration-10.5/17-an-empty-feed-polls-only-for-new-lines.md)), cellar
  writes reading back as made
  ([18](iteration-10.5/18-a-cellar-write-reads-back-as-it-was-made.md)), and
  the one mobile task, the slow-Keycloak delay
  ([19](iteration-10.5/19-a-slow-keycloak-delays-one-call-not-every-call.md)),
  the only SHOULD left open.

Left in the quality backlog on purpose: COULD-26, the password-reset page's
`autocomplete="off"`, which is stock Keycloak markup, touches nothing here,
and is too small to stand alone.
