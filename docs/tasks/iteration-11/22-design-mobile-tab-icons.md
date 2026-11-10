# Task 22: Design the mobile tab icons

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

The navigation directions in [task 02](02-design-the-interaction-model-and-navigation.md)
use generic placeholder symbols. The product owner wants the app's tab icons
designed deliberately rather than accepting those placeholders as the final
identity.

## Scope

Choose and build a coherent set of mobile tab icons for the destinations and
central action, if any, chosen in task 02. Show alternatives in the mobile
navigation and record the choice as standing design intent.

## Non-goals

- The app icon, splash screen and name —
  [task 03](03-design-kalias-identity-on-a-phone.md) keeps them as shipped.
- Changing the navigation structure chosen in task 02.

## Constraints

- The navigation choice from task 02 and the mobile identity from
  [task 03](03-design-kalias-identity-on-a-phone.md) bind the directions.
- Consider the existing web icon decision in
  [ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md); a conflicting
  accepted choice is a new decision, not an unannounced exception.
- Controls remain accessible by role and name, in both locales
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md),
  [ADR-0011](../../adr/0011-i18next-localization.md)).
- New dependencies are asked about before use
  ([`CLAUDE.md`](../../../CLAUDE.md)).

## Open questions

- **Scope and interaction.** Which tab and action states need distinct icons,
  and how do the labels and selected state accompany them?
- **Design and constraints.** Should the icons carry the web's drawn style,
  use platform conventions, or explore both? Does the answer change the
  existing icon decision?
- **Accessibility and completion.** How should the alternatives be checked
  for legibility, contrast and recognition at device sizes and large text?

## Acceptance criteria

- [ ] The product owner chooses the tab icons from built alternatives shown
      in the mobile navigation, and an ADR records the choice
- [ ] A component test finds every tab and central action, if present, by its
      accessible name with the chosen icons
- [ ] The product owner signs off the built icons on the mobile design route
      chosen by task 01
- [ ] `make verify-fast` is green

## Notes

Requested by the product owner during task 02's framed-direction rounds.
