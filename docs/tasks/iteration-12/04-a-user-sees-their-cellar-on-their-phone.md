# Task 04: A user sees their cellar on their phone

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

The signed-in Cellar tab shows a placeholder. The API already answers the whole
cellar in one read, joined with its beers
([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
and the web uses it; the app does not. Everything else in this iteration is a
change to what this screen shows, so it comes first.

## Scope

The Cellar tab for a signed-in user as [task 02](02-design-the-cellar-list.md)
designed it, read from `GET /api/v1/cellar`: the list, its totals, its order and its
find field, and its loading, error and empty states, with a pull to refresh. The signed-out
invitation stays as it is.

## Non-goals

- What opens from a row — [task 05](05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md).
- Adding, editing and removing — tasks [08](08-a-user-adds-bottles-of-a-beer-from-its-page.md),
  [09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md),
  [11](11-a-user-edits-a-bottle.md) and [12](12-a-user-removes-a-bottle.md).
- Keeping the cellar for use without a signal — [task 14](14-the-last-loaded-cellar-is-kept-on-the-phone.md).
- Public cellars — [iteration 13](../iteration-13.md).

## Constraints

- Reads go through a feature-owned hook over the generated client, built from a
  key factory
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)); the
  feature reaches only its own tag of the client
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
- The read is whole, up to [task 19](19-a-cellar-has-a-size-limit-the-server-enforces.md)'s
  2,000 bottles, so a long cellar is rendered as a virtualised list.
- The viewer's cellar must never outlive the viewer: the query client resets on
  a change of viewer
  ([mobile conventions](../../../mobile/CONVENTIONS.md)).
- Loading, error and empty are three different states
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)); an enum value the
  server adds later is shown, not dropped.
- Tokens and primitives only; every control has a role and a name, no fixed
  height around text; every string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **The Maestro flow seeds its cellar through the API in a preflight,** as
  [task 18](18-the-cellars-flows-run-end-to-end-on-both-platforms.md)'s
  Constraints require of every flow; it does not wait for the add flow.
- **The cellar is read again when the app returns to the foreground and its data
  is older than the client's 60 seconds;** not on the tab being focused.
- **The list's five orders and its find field** are
  [task 02](02-design-the-cellar-list.md)'s decisions, applied here to the
  read.

## Open questions

**None.**

## Acceptance criteria

- [x] A component test shows the loading, error with its retry, empty and
      populated states, and a pull to refresh reading again
- [x] A component test shows a withdrawn entry marked and an unknown style or
      container shown rather than dropped
- [x] A component test shows a long Finnish beer name at the largest font scale
      reading in full, and the rows found by role and accessible name
- [x] A component test shows the previous viewer's cellar gone after a change of
      viewer
- [x] A component test shows a return to the foreground reading the cellar again
      when its data is older than 60 seconds, and not when it is fresher
- [x] A component test shows the read sorted in each of the five orders and
      narrowed by the find field
- [x] A Maestro flow signs in and reads a seeded cellar on Android, and was
      confirmed to fail against the placeholder
- [ ] The product owner used the screen on both platforms and signed it off
- [x] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Cellar list and entry
detail"), split from the entry so each change is small.
