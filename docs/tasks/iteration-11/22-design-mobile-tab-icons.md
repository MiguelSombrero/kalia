# Task 22: Design the mobile tab icons

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

The navigation directions in [task 02](02-design-the-interaction-model-and-navigation.md)
use generic placeholder symbols. The product owner wants the app's tab icons
designed deliberately rather than accepting those placeholders as the final
identity.

## Scope

Choose and build a coherent set of mobile tab icons for the four destinations
and the central Add action chosen in task 02
([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)),
with the selected and unselected state of each. Show alternatives in the mobile
navigation and record the choice as standing design intent.

## Non-goals

- The app icon, splash screen and name —
  [task 03](03-design-kalias-identity-on-a-phone.md) keeps them as shipped.
- Changing the navigation structure chosen in task 02.
- How the selected state moves or feels — [task 05](05-design-motion-and-haptics.md);
  the dark palette — [task 04](04-decision-and-design-dark-mode.md).

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it.
- The navigation choice from task 02 and the mobile identity from
  [task 03](03-design-kalias-identity-on-a-phone.md) bind the directions: the
  tab bar's fixed height, its labels near their default size, and the selected
  tab in cobalt ([`docs/design.md`](../../design.md)).
- [ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md) kept navigation
  tabs as words and rejected loud icons over them; the phone departing from it
  is a new decision, amended into that ADR for the phone only.
- Controls remain accessible by role and name, in both locales
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md),
  [ADR-0011](../../adr/0011-i18next-localization.md)); an icon beside a word is
  hidden from assistive technology, as ADR-0065 has it.
- New dependencies are asked about before use
  ([`CLAUDE.md`](../../../CLAUDE.md)).

**Decided at refinement, 2026-11-12** (product owner):

- **Each tab shows its icon with its word, always,** in `en` and `fi`; the
  central Add action keeps its circle and no word
  ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)).
  The task's design record departs from ADR-0065 for the phone, which gains
  an `Amended` line; the web's navigation stays words.
- **The built alternatives explore both** the web's drawn style, extended from
  the seven icons of ADR-0065, and the platforms' own symbols. Framed
  alternatives may draw anything. The SVG library the owner declined for the
  mark ([ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md))
  is not assumed: if a drawn set is carried forward, the renderer and its
  version are asked about then, in one batched question; platform symbols need
  none.
- **Whether the selected tab has a distinct icon** (filled against outlined) or
  only the tint and underline it has is a choice between the alternatives.
- **An icon takes its colour from the tab bar's tint,** and carries none of
  its own, so one drawing is right in both modes of
  [task 04](04-decision-and-design-dark-mode.md). Each icon in each state meets
  the 3:1 non-text contrast against the bar, checked by
  `scripts/check-contrast.mjs` for every mode that exists when this is built.
- **Evidence is [ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)'s:**
  alternatives shown with Finnish labels and at the largest text size, a
  component test per control, and the owner's VoiceOver walk on the iPhone.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chooses the tab icons from built alternatives shown
      in the mobile navigation, and a design record holds the choice
- [ ] A component test finds every tab and the central Add action by its
      accessible name with the chosen icons, and shows each icon hidden from
      assistive technology beside its word
- [ ] `scripts/check-contrast.mjs` covers every icon state against the tab bar
      and fails on a pairing below 3:1 — test
- [ ] The product owner signs off the built icons on the mobile design route
      chosen by task 01
- [ ] `make verify-fast` is green

## Notes

Requested by the product owner during task 02's framed-direction rounds.
