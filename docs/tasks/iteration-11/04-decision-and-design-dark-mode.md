# Task 04: Design the app's dark mode

- **Status:** refined
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

The app's dark mode, which follows the system (decided at refinement), and
its design: the dark palette, the style-group
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
  amends it.
- Every colour pairing of the dark palette passes the contrast the identity is
  held to ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md),
  `scripts/check-contrast.mjs`), including each style group's pair.
- `userInterfaceStyle` in `mobile/app.json` is native configuration: a change is
  a rebuild of the development build
  ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
- The "update required" and "maintenance" screens
  ([task 08](08-mobile-ui-primitives.md)) must be right in whichever mode the
  system is in.

**Decided at refinement, 2026-11-07** (product owner):

- **The app has a dark mode, and it follows the system setting,** with no
  in-app switch. `userInterfaceStyle` in `mobile/app.json` becomes
  `automatic`. What this task designs is the dark palette, from built
  directions; the light-only alternatives no longer apply.
- **Whether the style-group colours are re-derived on dark** is a choice
  between directions; each must still name its style at a glance and pass
  contrast on its surface.
- **The splash follows the system's mode, and the first frame reads the
  system's scheme before it draws,** so no light frame flashes in dark.
- The token source ([task 06](06-decision-the-design-token-format.md),
  [07](07-token-pipeline.md)) models two modes from the start; this task
  writes the dark values into it.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chose the dark palette from built alternatives,
      judged in a dark room on the route task 01 chose; an ADR records the
      decision to follow the system, the directions and the choice
- [ ] `scripts/check-contrast.mjs` covers every pairing of the dark palette
      and fails on a pairing below AA — test
- [ ] A component test renders a screen in both modes and shows it readable,
      and the "update required" and "maintenance" screens in both
- [ ] The product owner signed off the built result live
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Decision and design:
dark mode"). One task, because the design is moot if the decision is no.
