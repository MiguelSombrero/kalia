# Task 04: Decide whether the app has a dark mode, and design it if so

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

A phone is used in the dark more than a desktop is, and a beer cellar is a
dark place; a user whose system is set to dark sees an app that ignores it.
Today that is deliberate and invisible: `mobile/app.json` pins
`userInterfaceStyle` to `light`, and the web has no dark palette.

Whether to follow the system is not a styling detail. A second palette doubles
what every colour decision must be checked against, and the style-group colours
([ADR-0064](../../adr/0064-visual-identity-can-art-square.md)) were chosen
against a light surface. It is cheapest to decide before the token format
([task 06](06-decision-the-design-token-format.md)) and the primitives
([task 08](08-mobile-ui-primitives.md)) assume one palette or two.

## Scope

A decision, then — if the answer is yes — a design. The decision: whether the
app has a dark mode, and whether it follows the system, offers its own switch,
or both. The design, only if it has one: the dark palette, the style-group
colours on it, the beer and person slots on it, and how it is checked, built on
the real screens beside the light identity of [task 03](03-design-kalias-identity-on-a-phone.md).

## Non-goals

- A dark web app; the web stays as it is, and a shared token source
  ([task 06](06-decision-the-design-token-format.md)) must merely not forbid it.
- The light identity itself — [task 03](03-design-kalias-identity-on-a-phone.md).

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it. If the product owner decides against a dark mode, the alternatives
  built are the light-only app with and without the system's dark chrome (status
  bar, keyboard, alerts) handled.
- Every colour pairing of the dark palette passes the contrast the identity is
  held to ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md),
  `scripts/check-contrast.mjs`), including each style group's pair.
- `userInterfaceStyle` in `mobile/app.json` is native configuration: a change is
  a rebuild of the development build
  ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
- The "update required" and "maintenance" screens
  ([task 08](08-mobile-ui-primitives.md)) must be right in whichever mode the
  system is in.

## Open questions

- **Functional scope.** Whether there is a dark mode at all, and what the
  alternative is worth if there is not.
- **Interaction.** Follow the system, an in-app switch, or both; and where a
  switch would live and whether it persists.
- **Domain.** Whether the style-group colours are the same in both modes or
  are re-derived, and whether a re-derived one still names its style at a
  glance.
- **Edge cases.** The splash screen and the first frame before the theme loads.

## Acceptance criteria

- [ ] The product owner decided whether the app has a dark mode from built
      alternatives, and if it does, chose its palette from built directions,
      judged in a dark room on the route task 01 chose; an ADR records the
      directions and the choice
- [ ] `scripts/check-contrast.mjs` covers every pairing of the dark palette,
      or of the dark chrome in the light-only case, and fails on a pairing
      below AA — test
- [ ] A component test renders a screen in both modes (or, light-only, with the
      system's dark setting on) and shows the screen readable
- [ ] The product owner signed off the built result live
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Decision and design:
dark mode"). One task, because the design is moot if the decision is no.
