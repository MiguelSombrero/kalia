# Task 03: Design a cellar entry and its bottles

- **Status:** done
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1
- **Kind:** design

## Why

A cellar holds beers, and a beer holds bottles that each carry their own brewed
and best-before dates and their own container
([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)): two bottles of
one beer, brewed two years apart, are different things to their owner. The list
([task 02](02-design-the-cellar-list.md)) says what is held; this is where the
bottles are read, and where the actions on one begin. The web shows each bottle
as a tile headed by its vintage; how a phone shows a dozen of them, one of which
has expired, is the product owner's to choose from built alternatives.

## Scope

What opens from a cellar row: its place in the navigation (a sheet over the
Cellar tab, as a beer's page is over the Catalog, or a pushed screen), the
beer's facts at its head, each bottle with its container, vintage and
best-before and what says one is past its best-before date, the order the
bottles are in, a way to the beer's catalog page, and the room the edit, remove
and add actions will use ([task 10](10-design-acting-on-a-bottle-edit-and-remove.md),
[task 06](06-design-the-bottle-form.md)). Built as working components over local
sample data, in both locales and at the largest text size, on both platforms'
conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Reading the data — [task 05](05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md).
- How a bottle is edited, removed or added — tasks 06, 10.
- The beer's own catalog page, which exists
  ([iteration 11 task 10](../iteration-11/10-beer-details.md)).

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)); the
  route follows what is judged
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- Beer details are a sheet, and a sheet has an explicit close as well as native
  dismissal
  ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md));
  a direction that is not a sheet says why.
- Identity per [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md),
  from primitives and tokens only; WCAG 2.2 AA
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)).
- A bottle's dates are each optional, and an expired bottle is "strictly before
  today", as on the web; a date is a day with no time zone, so it is formatted
  without one.
- A withdrawn beer keeps its bottles but has no catalog page and takes no more
  bottles
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
- The entry must read from what the list already holds, since it may be opened
  with no signal ([task 01](01-decision-how-the-cellar-behaves-offline.md)); a
  direction that needs a second read says so.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Decided at refinement, 2026-11-22** (product owner):

- **Which is the product owner's choice between alternatives,** with no answer
  fixed beforehand: bottles that are alike as one row with a count or a row each
  (removing one stays possible either way); the bottles' order, by vintage as on
  the web or by best-before; what a bottle with no recorded date says instead of
  a blank; and how a bottle past its best-before date is marked, without colour
  alone and without reading as spoiled.
- An edit and a removal show at once
  ([task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)); the
  room left for them assumes no wait.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum the entry's
      presentation and a bottle's row, each judged at the largest text size in
      both locales; a design record holds the directions and the choice
- [x] A component test finds the close action, every bottle and its dates by
      role and accessible name, and reads an expired bottle as expired without
      colour
- [x] A component test renders an entry with twenty-four bottles, some with no
      dates, and a long Finnish beer name at the largest font scale, reading in
      full
- [x] A component test shows a withdrawn entry with its bottles and no link to
      a catalog page
- [x] `docs/design.md` carries the chosen entry as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [x] The product owner signed off the built entry live, on the route
      [ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
      names
- [x] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Design: the cellar on
mobile — the beer list, its bottles").
