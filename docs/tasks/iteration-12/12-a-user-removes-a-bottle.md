# Task 12: A user removes a bottle

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

A bottle is drunk. `DELETE /api/v1/cellar/bottles/{id}` removes it, and the
cellar is only true if that is as quick on a phone as adding one.

## Scope

From a bottle on an entry, the user removes it as
[task 10](10-design-acting-on-a-bottle-edit-and-remove.md) chose: the swipe
action and its visible alternative, the confirmation or undo, and the end of the
entry when its last bottle goes. The entry and the cellar show the removal.

## Non-goals

- Editing — [task 11](11-a-user-edits-a-bottle.md).
- Removing several bottles at once, or a whole beer from the cellar in one
  action.
- A removal that shows at once and rolls back —
  [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).

## Constraints

- A feature-owned mutation over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)).
- **There is no undelete.** If task 10 chose an undo, it adds the bottle again
  through `POST /api/v1/cellar/bottles`, as one bottle of the same beer with the
  same container and dates, and the removed bottle's id is not restored.
- The last bottle removed removes the entry, and the sheet that showed it goes
  with it
  ([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)).
- `404` — the bottle is already gone — is the removal done ([task 21](21-a-bottle-that-is-already-gone-is-not-a-failure.md)), and a
  removal repeated by a double tap must not report an error for the second
  request.
- Roles, names and tap targets; every string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **A removal answered `404` has succeeded,** as [task 21](21-a-bottle-that-is-already-gone-is-not-a-failure.md) rules, and a
  double tap's second request ends the same way.
- **An undo, if task 10 chose one, whose beer was withdrawn in the meantime**
  fails with a message of its own: the bottle could not be put back because the
  beer is no longer in the catalog. The bottle stays gone.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows a removal through the swipe action and through its
      visible alternative, each removing the bottle and the entry's count
- [ ] A component test shows the last bottle's removal closing the sheet and
      leaving the cellar without the beer
- [ ] A component test shows a double tap sending one request and, if task 10
      chose an undo, the undo adding the bottle back once and an undo of a
      withdrawn beer's bottle ending in its own message
- [ ] A component test shows a removal answered `404` leaving the bottle gone,
      with no failure shown and no error logged
- [ ] A Maestro flow removes a seeded bottle and reads the lowered count on
      Android, and was confirmed to fail without the action
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Edit and remove a
bottle").
