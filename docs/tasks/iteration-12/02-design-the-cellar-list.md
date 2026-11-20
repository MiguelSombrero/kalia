# Task 02: Design the cellar list

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1
- **Kind:** design

## Why

The signed-in Cellar tab is a "coming soon" placeholder, and the cellar is the
product. The web's answer is a sortable list of beers, each beside its style
band, with a summary of figures above it
([ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md)):
a page's answer. What a phone shows first, in a hand, standing at a shelf, is a
choice the product owner wants to make from built alternatives.

## Scope

The signed-in Cellar tab: a row for each beer — what it says of the beer and of
the bottles held — the cellar's totals, the order of the rows and whether the
user can change it, the empty cellar and the way it offers to add a bottle, and
the row of a beer an operator has since withdrawn. Built as working components
over local sample data, in both locales and at the largest text size, on both
platforms' conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Reading the cellar from the API — [task 04](04-a-user-sees-their-cellar-on-their-phone.md).
- What opens from a row — [task 03](03-design-a-cellar-entry-and-its-bottles.md).
- Searching or filtering inside the cellar, unless refinement adds it.
- Beer images, which the product does not have.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill; the route follows what is judged
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- The identity is [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)'s,
  the navigation [ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)'s;
  a direction that contradicts either is a new decision. Built from the app's
  primitives and tokens, with no value outside them.
- The entry the list draws is what the API returns: the beer's name, brewery,
  style and strength, a bottle count, the bottles, and a `withdrawn` flag
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
  An empty entry is never returned; the list is not paged.
- WCAG 2.2 AA in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): no
  control needs a gesture, every control has a role and a name, nothing sits in
  a fixed height around text.
- A style or container the server adds later is shown, not dropped
  ([iteration 11 task 18](../iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Open questions

- **Sorting.** The web sorts five ways (name, style, strength, bottles held,
  soonest best-before). Does the phone offer sorting at all, and which
  orders, or one fixed order?
- **What a row says beyond the count.** Whether the soonest best-before, or a
  bottle already past it, is shown on the row — the web shows it in the
  bottle tiles, not on the beer.
- **Grouping.** A flat list, or beers grouped by style?
- **Where the totals sit,** and whether they are a header that scrolls away or
  stay in view.
- **Finding a beer in a long cellar.** A thousand-bottle cellar is not
  scrollable by eye; is a search field in scope here or a later task?

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the row, the
      order and the empty cellar, each judged at the largest text size in both
      locales; a design record holds the directions and the choice
- [ ] A component test finds every row, the totals and the empty state's action
      by role and accessible name
- [ ] A component test renders a row with a long Finnish beer and brewery name
      at the largest font scale, reading in full
- [ ] A component test shows a withdrawn beer's row marked as withdrawn and a
      style the app does not know drawn rather than dropped
- [ ] `docs/design.md` carries the chosen list as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [ ] The product owner signed off the built list live, on the route
      [ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
      names
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Design: the cellar on
mobile"), split so that each surface is reviewed on its own.
