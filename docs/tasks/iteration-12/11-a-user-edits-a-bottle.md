# Task 11: A user edits a bottle

- **Status:** needs-refinement
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
  The sheet the user is in must survive both.
- Roles, names and tap targets; every string in `en` and `fi`.

## Open questions

- **A bottle that was removed elsewhere** while the form is open (on the web, or
  on another phone): the message, and whether the form closes.
- **Whether a save that changes nothing** sends a request.

## Acceptance criteria

- [ ] A component test shows the form opening with the bottle's container and
      dates, sending all three on save, and the entry showing the new values
- [ ] A component test shows a `404` and a `409` each leaving the form open with
      its own message, and nothing sent for a save that changed nothing
- [ ] A Maestro flow edits a seeded bottle's best-before date and reads the new
      date on Android, and was confirmed to fail without the action
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Edit and remove a
bottle").
