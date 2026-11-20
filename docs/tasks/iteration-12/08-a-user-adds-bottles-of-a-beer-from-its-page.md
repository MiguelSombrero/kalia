# Task 08: A user adds bottles of a beer from its page

- **Status:** needs-refinement
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
that opens the bottle form of [task 06](06-design-the-bottle-form.md) for that
beer and adds the bottles. The cellar and what is held are read again after the
add, and the user is told it was added. A signed-out visitor is offered sign-in
from the page, as the Cellar tab does.

## Non-goals

- Finding a beer from the Add action or from inside the cellar —
  [task 09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md).
- An add that shows at once and rolls back on failure —
  [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md); this
  task waits for the server.
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

## Open questions

- **What the user is told after an add** — a confirmation on the page, a
  toast, the sheet closing onto the cellar; the answer follows
  [task 07](07-design-the-add-action-and-finding-the-beer-to-add.md)'s.
- **A double tap on the submit.** Sending twice adds two sets of bottles; the
  form is disabled while a write is in flight, and the question is only
  whether anything more is wanted.
- **The `409`.** A message and a retry, or a silent single retry before the
  user is told?
- **A pending beer.** Does a contributor's own beer, still waiting for an
  operator, offer the action at all, given that the cellar then holds a beer
  that may be rejected and becomes withdrawn?

## Acceptance criteria

- [ ] A component test shows the form for a beer submitting once with the
      chosen container, dates and quantity, and the cellar and the held count
      read again after it
- [ ] A component test shows a double tap sending one request, a `409` leaving
      the form open with its message and a retry, and a `404` shown as an
      answer
- [ ] A component test shows a contributor's own pending beer treated as the
      refinement decides, and a signed-out visitor offered sign-in
- [ ] A Maestro flow adds bottles of a seeded beer from its page and finds them
      in the cellar on Android, and was confirmed to fail without the action
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Add bottles of a beer").
