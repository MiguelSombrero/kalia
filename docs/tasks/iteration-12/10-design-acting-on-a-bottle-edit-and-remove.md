# Task 10: Design acting on a bottle — edit and remove

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1
- **Kind:** design

## Why

A bottle is wrongly dated, or drunk. On the web an edit is a dialog and a
removal is an undo toast, because the product owner chose undo over an upfront
confirmation
([iteration 5 task 14](../iteration-5/14-edit-remove-bottle.md)). A phone's
conventions are other ones: a swipe on a row for the actions, a sheet or alert
for a confirmation, and an undo that iOS and Android favour differently. How a
bottle is acted on — gesture and visible alternative, confirmation or undo — is
an interaction choice the product owner wants to make from built alternatives
and in the hand, not on a screen.

## Scope

How a bottle's edit and remove start from its row on the entry
([task 03](03-design-a-cellar-entry-and-its-bottles.md)): the swipe actions and
the visible alternative every gesture needs, what removal asks or offers —
confirmation, undo, or both — and where an undo lives, what happens to the
sheet when the last bottle goes, and how an edit opens the form of
[task 06](06-design-the-bottle-form.md). Built as working components over local
state in a native build, on both platforms' conventions where they differ,
with the haptics, if any, that
[iteration 11 task 05](../iteration-11/05-design-motion-and-haptics.md) set.
Standing intent goes in [`docs/design.md`](../../design.md).

## Non-goals

- Sending the edit or the removal — tasks [11](11-a-user-edits-a-bottle.md) and
  [12](12-a-user-removes-a-bottle.md).
- Removing several bottles at once, and editing several.
- Failures and the offline state — [task 13](13-design-the-cellar-offline-and-a-write-that-fails.md).

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), and
  a gesture and a haptic are judged on a device, not in a frame
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- A gesture is never the only way to do something
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): every
  swipe action has a control a screen reader and a switch user reach.
- **The API has no undelete.** An undo can only add the bottle again as a new
  one, with a new id and a new creation time, so an undo is the same bottle to
  the user and a different one to the server. The web works the same way
  ([iteration 5 task 14](../iteration-5/14-edit-remove-bottle.md)).
- An edit replaces the container and both dates and never the quantity; the
  last bottle removed removes the entry
  ([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)).
- Identity per [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md);
  every string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **Which is the product owner's choice between alternatives,** with none fixed
  beforehand: undo, confirmation, or each platform its own (the directions
  include the web's undo and a confirmation); how long an undo lasts and whether
  it survives leaving the screen; whether a tap on a bottle opens its edit; and
  what the user is told when the last bottle goes, and whether an undo then
  restores the entry.
- **An edit opens [task 06](06-design-the-bottle-form.md)'s form** with the beer
  fixed and no quantity.
- **An edit and a removal show at once** and are put back if the server rejects
  them ([task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)),
  so the directions show them done with no wait.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum how an edit
      and a removal start and what a removal asks or offers, each felt on both
      platforms; a design record holds the directions and the choice
- [ ] A component test shows every swipe action also reachable as a control
      found by role and accessible name, and the removal's confirmation or undo
      doing what the choice says
- [ ] A component test shows removing the last bottle ending as the choice
      says, and an undo restoring a bottle once
- [ ] `docs/design.md` carries the chosen interaction as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [ ] The product owner signed off the built interaction live, on both
      platforms
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Edit and remove a bottle
— swipe actions, and undo where the platform favours it over a confirmation").
