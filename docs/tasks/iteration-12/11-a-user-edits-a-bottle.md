# Task 11: A user edits a bottle

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

A date was mistyped, or a bottle turned out to be a can. The API's
`PATCH /api/v1/cellar/bottles/{id}` replaces a bottle's container and both
dates, and the app has no way to call it.

## Scope

From a bottle on an entry, the user opens the form of
[task 06](06-design-the-bottle-form.md) prefilled with its container and dates,
changes them and saves; the entry and the cellar then show the new values. The
way an edit starts is [task 10](10-design-acting-on-a-bottle-edit-and-remove.md)'s.

## Non-goals

- Removing a bottle — [task 12](12-a-user-removes-a-bottle.md).
- The beer a bottle belongs to, and its quantity; a bottle cannot move between
  beers.
- A save that shows at once and rolls back —
  [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).

## Constraints

- A feature-owned mutation over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)); the
  cellar's read is refreshed from the server's answer, never patched by hand in
  this task.
- The `PATCH` replaces all three fields, so the form sends all three, including
  the ones the user did not touch.
- `404` means the bottle is gone or was never the caller's, and `409` that a
  concurrent write was lost with nothing changed
  ([`CellarController`](../../../backend/src/main/java/fi/kalia/cellar/web/CellarController.java)).
  The sheet the user is in must survive both, except where a `404` leaves the
  entry with no bottle, which closes it.
- Roles, names and tap targets; every string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **A bottle gone elsewhere (`404`) ends as [task 21](21-a-bottle-that-is-already-gone-is-not-a-failure.md) rules;** if it was
  the entry's last bottle, the read leaves no entry and the sheet closes as
  [task 10](10-design-acting-on-a-bottle-edit-and-remove.md) chose for the last
  bottle.
- **A `409` leaves the form open with its message and a retry,** as
  [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md) decided.
- **A save that changes nothing sends no request** and closes the form.
- **A write whose answer never arrives** ends as
  [task 16](16-a-write-attempted-offline-says-so.md) decided; showing the edit
  before the answer is [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)'s.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows the form opening with the bottle's container and
      dates, sending all three on save, and the entry showing the new values
- [ ] A component test shows a `404` closing the form with task 21's notice and
      the entry read again, a `409` leaving the form open with its message and a
      retry, and a save that changed nothing sending no request and closing the
      form
- [ ] A Maestro flow edits a seeded bottle's best-before date and reads the new
      date on Android, and was confirmed to fail without the action
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Edit and remove a
bottle").
