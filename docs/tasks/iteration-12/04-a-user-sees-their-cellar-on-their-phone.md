# Task 04: A user sees their cellar on their phone

- **Status:** needs-refinement
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
designed it, read from `GET /api/v1/cellar`: the list, its totals and order, and
its loading, error and empty states, with a pull to refresh. The signed-out
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
- The read is uncapped, so a long cellar is rendered as a virtualised list.
- The viewer's cellar must never outlive the viewer: the query client resets on
  a change of viewer
  ([mobile conventions](../../../mobile/CONVENTIONS.md)).
- Loading, error and empty are three different states
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)); an enum value the
  server adds later is shown, not dropped.
- Tokens and primitives only; every control has a role and a name, no fixed
  height around text; every string in `en` and `fi`.

## Open questions

- **How a Maestro flow gets a cellar to read.** No cellar data is seeded for the
  test user; the flow can add bottles through the API in a preflight, or read
  an empty cellar until the add flow exists. Which?
- **When the list reads again.** After the add, edit and remove tasks the
  writes refresh it; does it also refresh when the app returns to the
  foreground, or on the tab being focused, beyond the 60-second freshness the
  client already has?

## Acceptance criteria

- [ ] A component test shows the loading, error with its retry, empty and
      populated states, and a pull to refresh reading again
- [ ] A component test shows a withdrawn entry marked and an unknown style or
      container shown rather than dropped
- [ ] A component test shows a long Finnish beer name at the largest font scale
      reading in full, and the rows found by role and accessible name
- [ ] A component test shows the previous viewer's cellar gone after a change of
      viewer
- [ ] A Maestro flow signs in and reads a seeded cellar on Android, and was
      confirmed to fail against the placeholder
- [ ] The product owner used the screen on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Cellar list and entry
detail"), split from the entry so each change is small.
