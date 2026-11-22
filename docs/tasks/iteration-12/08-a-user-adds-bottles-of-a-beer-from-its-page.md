# Task 08: A user adds bottles of a beer from its page

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

The beer's page already has a place for the cellar action and nothing in it
(`CellarAction` renders nothing "until it exists"). A user reading about a beer
in the catalog is the commonest moment to want one in the cellar, and the
API's `POST /api/v1/cellar/bottles` takes a beer, a container, two optional
dates and a quantity of up to twenty-four.

## Scope

On a beer's page: what the signed-in user already holds of it, and an action
that opens [task 07](07-design-the-add-action-and-finding-the-beer-to-add.md)'s
Add form with that beer filled in and adds the bottles. On this page the tab
bar's Add action opens the same form, its label naming the beer. The cellar and what is held are read again after the
add, and the user is told it was added. A signed-out visitor is offered sign-in
from the page, as the Cellar tab does.

## Non-goals

- Finding a beer from the Add action or from inside the cellar —
  [task 09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md).
- An add shown before the server answers: an add always waits, as
  [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)'s
  decisions record.
- A mark on the catalog's list rows for beers held.
- Editing and removing — tasks [11](11-a-user-edits-a-bottle.md) and
  [12](12-a-user-removes-a-bottle.md).

## Constraints

- Writes go through a feature-owned mutation over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)), and the
  catalog feature does not import the cellar's: the two meet through a
  `src/lib/` store or a component the screen composes, never an import
  ([mobile conventions](../../../mobile/CONVENTIONS.md)).
- What a user holds of a beer is `GET /api/v1/cellar/holdings` with the beer's
  id; the app never reads the whole cellar to answer it.
- A concurrent write the server could not settle answers `409` with nothing
  changed; the user can repeat it
  ([`CellarController`](../../../backend/src/main/java/fi/kalia/cellar/web/CellarController.java)).
- A `404` is "that beer is not there"; it is an answer, not an error to log
  ([iteration 11 task 17](../iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md)).
- Roles, names and tap targets; every string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **The action opens [task 07](07-design-the-add-action-and-finding-the-beer-to-add.md)'s
  Add form with this beer filled in,** from the page's cellar action and from the
  tab bar's Add action on this page alike.
- **A `409` leaves the form open with a message and a retry:** the cellar was
  changed somewhere else at the same moment and nothing was saved, as the web
  says it. Nothing is repeated without the user. This binds
  [task 11](11-a-user-edits-a-bottle.md) and [task 26](26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md) too.
- **A double tap sends one request:** the submit is disabled while a write is in
  flight, and nothing more is wanted.
- **A contributor's own pending beer offers the action** and takes bottles, as
  the API allows; if an operator later rejects it, the bottles stay and the
  entry shows as withdrawn
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
- **An add past the cellar's limit** shows
  [task 19](19-a-cellar-has-a-size-limit-the-server-enforces.md)'s refusal,
  naming how many bottles still fit.
- **What the user sees after the add** is task 07's choice; **a write whose
  answer never arrives** ends as [task 16](16-a-write-attempted-offline-says-so.md)
  decided.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows the page's action and the tab bar's Add action on
      the page each opening the form with the beer filled in, the Add action's
      accessible name naming the beer
- [ ] A component test shows the form for a beer submitting once with the
      chosen container, dates and quantity, and the cellar and the held count
      read again after it
- [ ] A component test shows a double tap sending one request, a `409` leaving
      the form open with its message and a retry, a `404` shown as an
      answer, and an add past the cellar's limit naming how many still fit
- [ ] A component test shows a contributor's own pending beer offering the
      action and taking bottles, and a signed-out visitor offered sign-in
- [ ] A Maestro flow adds bottles of a seeded beer from its page and finds them
      in the cellar on Android, and was confirmed to fail without the action
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Add bottles of a beer").
