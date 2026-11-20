# Task 13: Design the cellar offline and a write that fails

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-2, DW-3
- **Kind:** design

## Why

With the decision of [task 01](01-decision-how-the-cellar-behaves-offline.md)
the cellar will show what it last loaded when there is no signal, and a write
without one will be refused. Both are things a user must read correctly at a
glance, in a cellar, with a bottle in one hand: that what they see may be old,
how old, that the Add button will not work yet, and that a save they thought was
made was not. How these states look and what they say is wording and layout the
product owner wants to choose from built alternatives rather than accept from a
task file.

## Scope

How the cellar says it is offline and how old what it shows is, in the list and
on an entry; what a write attempted offline says and offers, for an add, an edit
and a removal, and what the Add action, the form and the swipe actions look like
while the phone has no signal; and what the user sees when the server rejects a
write after the screen showed it done — the screen returned to what it was, with
the reason. Built as working components over local state, with the states
forced, in both locales and at the largest text size, on both platforms'
conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Detecting the connection, keeping the cache and refusing the write —
  tasks [14](14-the-last-loaded-cellar-is-kept-on-the-phone.md),
  [15](15-the-app-knows-when-it-is-offline.md) and
  [16](16-a-write-attempted-offline-says-so.md); undoing a rejected write —
  [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).
- Offline states of the catalog and the feed, which need the server.
- Queued writes, unless [task 01](01-decision-how-the-cellar-behaves-offline.md)
  chooses them.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)); the
  states are shown as framed Artifacts and confirmed natively
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- The choice must agree with the ADR of task 01, which this task is refined
  after: what is kept, for how long, and whether the age is shown are its.
- Loading, error and empty stay three different states
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)); an offline notice
  is a fourth thing and never replaces the data it qualifies.
- A message is a sentence a person reads, not a status code, and says what to
  do. No colour carries meaning alone; the state is announced to a screen
  reader when it changes
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)).
- Identity per [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md);
  every string in `en` and `fi`.

## Open questions

- **Where the notice lives.** On the Cellar tab only, or across the app's
  chrome; a banner, a line in the header, or a mark on the tab.
- **How the age is told.** "Updated 3 hours ago", a date, or nothing unless the
  cache is old.
- **A refused write: dialog, toast or inline.** And whether the form keeps what
  the user typed so they can submit when the signal is back.
- **What the controls do offline.** Disabled with a reason, or enabled and
  refused when pressed.
- **A rejected write's message,** and whether the user can retry from it.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the offline
      notice with its age, the refused write and the rolled-back write, each
      judged at the largest text size in both locales; a design record holds
      the directions and the choice
- [ ] A component test shows each state — offline with data, offline with a
      refused add, edit and removal, and a rolled-back write — announced to a
      screen reader and found by role and accessible name
- [ ] A component test renders each state with a long Finnish beer name at the
      largest font scale, reading in full
- [ ] `docs/design.md` carries the chosen states as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [ ] The product owner signed off the built states live, on both platforms
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Persisted cache and
offline state", "Optimistic writes with rollback"): the parts a person sees.
