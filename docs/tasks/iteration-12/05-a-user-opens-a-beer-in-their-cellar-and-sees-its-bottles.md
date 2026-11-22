# Task 05: A user opens a beer in their cellar and sees its bottles

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

A row in the cellar says how many bottles are held. The reason to keep them
individually is the dates each carries, and the screen they are read on is the
one the edit, remove and add actions all start from.

## Scope

Opening a row of the cellar opens that beer's entry as
[task 03](03-design-a-cellar-entry-and-its-bottles.md) designed it: the beer, its
bottles with their container and dates, and a bottle past its best-before date
marked as such. The entry reads from the cellar's own cached read; the
way to the beer's catalog page opens the page that already exists, except for a
withdrawn beer, which has none.

## Non-goals

- Changing a bottle — tasks [11](11-a-user-edits-a-bottle.md) and
  [12](12-a-user-removes-a-bottle.md); adding one —
  [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md).
- A link that opens an entry from outside the app, which is
  [iteration 13](../iteration-13.md)'s deep-link work.

## Constraints

- The API has no read of one entry; the screen is drawn from the list's data
  and must not make a request of its own, so that it opens with no signal.
- The route and the sheet's dismissal follow
  [ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md):
  an explicit close, and Android Back dismisses first.
- A date is a day without a time zone; an expired bottle is strictly before
  today, as on the web. Dates are shown in the app's language.
- Tokens and primitives only; roles, names and tap targets
  ([mobile conventions](../../../mobile/CONVENTIONS.md)); every string in `en`
  and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **An entry whose last bottle goes while it is open** is
  [task 12](12-a-user-removes-a-bottle.md)'s to build, as
  [task 10](10-design-acting-on-a-bottle-edit-and-remove.md) chooses; nothing
  here removes a bottle.
- **An entry opened while the list's refresh fails shows what the list holds,**
  as [task 14](14-the-last-loaded-cellar-is-kept-on-the-phone.md) keeps a
  cellar on screen when a refresh fails; nothing newer is asked for.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows an entry's bottles with their dates and an expired
      bottle marked, found by role and accessible name
- [ ] A component test shows a bottle with no dates and an entry of twenty-four
      bottles at the largest font scale, reading in full
- [ ] A component test shows a withdrawn entry with its bottles and no catalog
      link, and an approved one's link opening the beer's page
- [ ] A component test shows the sheet issuing no request of its own, and still
      showing its bottles when the list's refresh fails
- [ ] A Maestro flow opens a seeded beer from the cellar and returns on
      Android, and was confirmed to fail without the screen
- [ ] The product owner used the screen on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Cellar list and entry
detail").
