# Task 03: Design Kalia's identity on a phone

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

"Can art, square"
([ADR-0064](../../adr/0064-visual-identity-can-art-square.md)) was chosen for a
browser: rem-based type, a sticky bar, hover and focus rings, pages that
reflow between two widths. A phone has none of those and has others — a text
size the user sets and the app must follow, a thumb for a pointer, a status bar
and a home indicator — and the app today has no identity at all, only
`#ffffff`, `#111111` and sizes written into each screen.

The aim is an app that is recognisably Kalia without being the web in a
smaller window, which means deciding what carries over (the mark, the
style-group colours, the character) and what is native.

## Scope

Kalia's look on a phone, applied to the same real screens in each direction:
type families and a scale that follows Dynamic Type, spacing and density at
tap-target sizes, shape and surface, colour roles including the style-group
colours, and how the beer and person slots
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)) look natively.
Standing intent lands in a mobile section of [`docs/design.md`](../../design.md).

## Non-goals

- Dark mode — [task 04](04-decision-and-design-dark-mode.md); motion and
  haptics — [task 05](05-design-motion-and-haptics.md).
- The token source and its generators —
  [tasks 06](06-decision-the-design-token-format.md) and [07](07-token-pipeline.md).
- Navigation — [task 02](02-design-the-interaction-model-and-navigation.md).

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it. A direction that contradicts ADR-0064 is a new decision, not a
  fourth option.
- WCAG 2.2 AA ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)):
  every colour pairing a direction uses is computed, and
  `scripts/check-contrast.mjs` is the check the chosen palette is held to.
- Type must scale: no text sets `allowFontScaling={false}` (a lint rule,
  [mobile README](../../../mobile/README.md)), and each direction is shown at
  the largest Dynamic Type size, with Finnish compounds.
- A font that ships in the app is a new dependency, and none costs money or
  needs an account ([`CLAUDE.md`](../../../CLAUDE.md)); its licence is
  recorded.
- The style groups are the web's
  ([`docs/design.md`](../../design.md#style-groups)); a style group the server
  adds later falls back to a colour rather than none.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Open questions

- **Functional scope.** How far the app departs from the web's palette and
  typefaces, and what must carry over for it to be Kalia.
- **Interaction and UX.** Density — one beer per row at the largest text size
  — and whether the style colour tints a row or only marks it.
- **Non-functional.** System fonts against a bundled face, and the weight a
  bundled face adds to the build.
- **Integrations.** Whether the app icon, splash screen and name
  ([mobile README](../../../mobile/README.md#icon-splash-and-name)) are redrawn
  with the identity or stay as shipped.
- **Edge cases.** A style group the app has no colour for.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the type,
      the density and the colour roles, each judged at the largest Dynamic Type
      size on the route task 01 chose; an ADR records the directions and the
      choice
- [ ] `docs/design.md` carries the mobile identity as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs`
      pass over it — test
- [ ] A component test shows a beer row with an unknown style group rendering
      a fallback colour and still readable
- [ ] The product owner signed off the built identity live on the screens that
      exist, next to the chosen direction
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Design: Kalia's
identity on a phone"). Built values land as constants until
[task 07](07-token-pipeline.md) generates them.
