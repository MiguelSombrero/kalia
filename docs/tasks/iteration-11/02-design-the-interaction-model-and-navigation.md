# Task 02: Design how the app is navigated

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

The app's four tabs — Catalog, Cellar, Feed, Profile — were set in
[iteration 9](../iteration-9/11-app-skeleton.md) as scaffolding under plain
`StyleSheet`, and nobody chose them. Every screen the next four iterations add
sits in whatever structure this task leaves: the cellar's add flow
([iteration 12](../iteration-12.md)), the feed and profiles
([iteration 13](../iteration-13.md)) and the barcode scan
([iteration 14](../iteration-14.md)) each need a home, and moving a tab after
they exist moves every deep link and habit.

The web's answer — one sticky bar and a Menu button
([ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)) — is
a page's answer, and the goal of this iteration is an app that is not a copy
of it.

## Scope

The app's navigation and interaction model: the tab structure and what each tab
holds; whether a central add or scan action exists and what it does before the
cellar can be added to; which things open as a sheet and which as a pushed
screen; and the gestures — swipe back, pull to refresh, swipe actions on a row
— each with the visible alternative that makes it optional. Directions are
built on real screens: the catalog list, a beer's details, the filter sheet, a
cellar entry stub and the signed-out Profile tab, in both locales and on both
platforms' conventions where those differ.

## Non-goals

- Colour, type and shape — [task 03](03-design-kalias-identity-on-a-phone.md);
  transitions and haptics — [task 05](05-design-motion-and-haptics.md).
- Building the screens — [tasks 08–10](08-mobile-ui-primitives.md).
- The cellar's, feed's and scan's own flows; this task leaves room for them.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it: directions are built, the product owner chooses, an ADR records
  the choice, and the same task then builds it.
- Navigation is Expo Router
  ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md));
  the `kalia://` scheme and the sign-in redirect keep working
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- WCAG 2.2 AA in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): a
  gesture is never the only way to do something.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); sample data is the
  seed's, Finnish included.
- Kalia never collects reviews and does not sell beer
  ([`CLAUDE.md`](../../../CLAUDE.md)), so neither appears in a direction.

**Decided at refinement, 2026-11-07** (product owner):

- **The directions design the final structure,** the one iterations 12–14
  fill, so no tab moves once their screens exist. A tab or a central add or
  scan action whose content has not arrived yet says so plainly and points at
  what works now; none is a control that does nothing.
- **One structure on both platforms, each in its own chrome** — tab bar,
  header and back behaviour. Android's back button pops within a tab, then
  returns to the Catalog tab, then leaves the app.
- **Tab and action labels,** in `en` and `fi`, are proposed with each
  direction and chosen with it.
- **A deep link** opens its screen inside its tab with that tab's root beneath
  it, so back has somewhere to go. **A signed-out user opening the cellar**
  sees what the cellar is and a sign-in action, not an error.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the tab
      structure, the central action and sheet against pushed screen, judged
      by the route task 01 chose; an ADR records the directions and the choice
- [ ] A component test shows each tab reachable by its accessible name and the
      chosen sheets dismissible without a gesture
- [ ] A Maestro flow visits every tab and opens and dismisses a sheet on
      Android, and was confirmed to fail against the iteration 9 shell
- [ ] The product owner signed off the built navigation live, on the route
      task 01 chose, next to the chosen direction
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Design: interaction
model and navigation"). Standing intent goes in [`docs/design.md`](../../design.md),
not in the ADR.
