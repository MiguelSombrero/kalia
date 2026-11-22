# Task 26: A user suggests a beer the catalog lacks while adding bottles of it

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

A bottle belongs to a catalog beer, and the catalog is a snapshot of Wikidata
plus what contributors add
([ADR-0077](../../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md),
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
A user holding a bottle the catalog lacks can suggest it on the web
([iteration 8](../iteration-8.md)); on the phone, the Add form's search finds
nothing and they stop there, with the bottle in their hand and nowhere to put
it.

## Scope

- From the Add form's search with no match
  ([task 07](07-design-the-add-action-and-finding-the-beer-to-add.md) designs
  it, [task 09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md)
  shows the way in), the user goes on to enter the beer's details — name, an
  existing brewery or a new one with its country, style and strength — and the
  bottles, and saving suggests the beer and adds the bottles to it.
- The web's similar-beers check before a suggestion, so a beer already in the
  catalog is picked rather than suggested twice.
- The cellar and what is held are read again afterwards; the beer shows in the
  cellar as waiting for review.

## Non-goals

- An operator's review of the suggestion, which stays on the web
  ([ADR-0101](../../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
- Suggesting a beer without adding bottles of it, and editing a suggestion once
  sent.

## Constraints

- **A suggestion is a pending beer with its new brewery,** reviewed inside
  `catalog`, and a contributor holds at most 20 pending ones, past which the
  API answers its documented `429`
  ([ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md));
  the `429` is shown as a message, not a failure.
- **Two calls, the suggestion and then the bottles,** not one endpoint: an
  endpoint doing both would write across `catalog` and `cellar`, which meet
  through events ([`docs/architecture.md`](../../architecture.md) §3).
- **The fields' bounds come from [task 22](22-the-clients-take-the-backends-bounds-from-one-place.md)'s
  home in `@kalia/api`,** shared with the web's add-beer form; the server stays
  the authority.
- The catalog and cellar features do not import each other; the form composes
  them as [task 09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md)
  chose ([mobile conventions](../../../mobile/CONVENTIONS.md)).
- **The suggestion's `409` is not the cellar's.** It means the name is already
  pending for someone else (`PendingElsewhereProblem`,
  [ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md))
  and is shown with the web's message for it, with no retry; the bottles' `409`
  ends as [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md) decided.
  A write whose answer never arrives ends as task 16 decided.
- **A suggestion attempted offline is refused before it is sent,** through the
  same check as the cellar's writes
  ([task 15](15-the-app-knows-when-it-is-offline.md)'s state), and what was
  typed is kept. A pending
  beer an operator later rejects keeps its bottles and shows as withdrawn
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
- **A Maestro flow that suggests a beer leaves nothing behind that counts:** it
  names the beer uniquely per run, and a postflight removes the flow's bottles
  and rejects the suggestion through the API, since rejections limit nothing
  (ADR-0102) and a rejected row is hidden, never deleted (ADR-0091).
- Roles, names and tap targets; no fixed height around text
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Decided at refinement, 2026-11-22** (product owner):

- **A search with no match goes on to suggesting the beer** in the same Add
  form, rather than leaving suggestions to the web.
- **If the bottles' add fails after the beer was suggested** — the cellar full,
  a `409`, the connection lost — the suggestion stays, the user is told the
  bottles were not added, and the form stays open on the pending beer with a
  retry that adds to it, never suggesting it a second time.
- **The cellar's 2,000-bottle limit** ([task 19](19-a-cellar-has-a-size-limit-the-server-enforces.md))
  **is checked on the phone before the suggestion is sent,** from the cellar's
  totals, so a full cellar is not left holding a suggestion it cannot take
  bottles of.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows a search with no match going on to the suggestion,
      the similar-beers check offering a beer already in the catalog, and a save
      sending the suggestion once and then the bottles once, with the cellar
      read again
- [ ] A component test shows the bottles' add failing after the suggestion — the
      cellar full, a `409`, the connection lost — leaving the form on the
      pending beer with its message, and a retry adding the bottles without a
      second suggestion
- [ ] A component test shows a full cellar refused before anything is sent, the
      cap of pending suggestions shown as its message, and a name pending
      elsewhere shown with its own message and no retry
- [ ] A component test shows a suggestion attempted offline refused before
      anything is sent, with what was typed kept
- [ ] A component test renders the suggestion's fields with a long Finnish beer
      and brewery name at the largest font scale, reading in full, each found by
      role and accessible name
- [ ] A Maestro flow suggests a beer from the Add form and finds it in the
      cellar marked as waiting for review on Android, its postflight removing
      its bottles and rejecting the suggestion, and was confirmed to fail without the flow
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: iteration 12's refinement on 2026-11-22, the product owner's answer
to task 07's question whether Add ever adds something other than a bottle: the
Add form searches the catalog and, with no match, goes on to suggest the beer.
