# Task 02: Design the cellar list

- **Status:** done
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
the bottles held — the cellar's totals, the order of the rows and how the user
changes it, a field that finds a beer in the cellar, the empty cellar and the way it offers to add a bottle, and
the row of a beer an operator has since withdrawn. Built as working components
over local sample data, in both locales and at the largest text size, on both
platforms' conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Reading the cellar from the API — [task 04](04-a-user-sees-their-cellar-on-their-phone.md).
- What opens from a row — [task 03](03-design-a-cellar-entry-and-its-bottles.md).
- Filtering the cellar by style, strength or any facet; the find field matches
  names only.
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

**Decided at refinement, 2026-11-22** (product owner):

- **The phone offers the web's five orders** — name, style, strength, bottles
  held, soonest best-before — **with name first by default.** How the order is
  chosen is a direction to build.
- **A "find in my cellar" field is in scope.** It narrows the loaded list by beer
  or brewery name on the phone, sends nothing, and so works from the offline
  cache ([task 01](01-decision-how-the-cellar-behaves-offline.md)). A find with
  no match is a state of its own, not the empty cellar.
- **Which is the product owner's choice between alternatives:** where the order
  control and the find field sit; what a row says beyond the count (the soonest
  best-before, a bottle already past it); a flat list or beers grouped by
  style; and where the totals sit and whether they stay in view.
- A cellar holds at most 2,000 bottles
  ([task 19](19-a-cellar-has-a-size-limit-the-server-enforces.md)); the list is
  built to stay fluid at that size.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum the row, the
      order, the find field and the empty cellar, each judged at the largest text size in both
      locales; a design record holds the directions and the choice
- [x] A component test finds every row, the totals and the empty state's action
      by role and accessible name
- [x] A component test renders a row with a long Finnish beer and brewery name
      at the largest font scale, reading in full
- [x] A component test shows a withdrawn beer's row marked as withdrawn and a
      style the app does not know drawn rather than dropped
- [x] A component test shows each of the five orders, the find field narrowing
      the rows by beer and by brewery name, and a find with no match shown
      apart from the empty cellar
- [x] `docs/design.md` carries the chosen list as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [x] The product owner signed off the built list live, on the route
      [ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
      names
- [x] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Design: the cellar on
mobile"), split so that each surface is reviewed on its own.
