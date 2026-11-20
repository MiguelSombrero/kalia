# Task 06: Design the bottle form

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1
- **Kind:** design

## Why

Adding a bottle and editing one ask for almost the same things: the container,
a brewed date and a best-before date, and for an add, how many. On the web that
is two dialogs
([iteration 5 task 13](../iteration-5/13-add-bottle-to-cellar.md),
[task 14](../iteration-5/14-edit-remove-bottle.md)); on a phone it is the
screen the user spends the most thumb time on, with the keyboard, the platform's
date pickers and the largest text all fighting for the same few inches. The
platforms differ most here, and it is a visual and interaction choice the
product owner wants to make from built alternatives.

## Scope

The bottle form as one component serving add and edit: the container (bottle,
can or keg), the quantity of an add, the brewed and best-before dates entered
with each platform's own picker and cleared again, the validation messages, and
the actions that submit and cancel it. Built as a working component over local
state, in both locales and at the largest text size, on both platforms'
conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Sending the form — [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md)
  for an add, [task 11](11-a-user-edits-a-bottle.md) for an edit.
- Finding the beer to add — [task 07](07-design-the-add-action-and-finding-the-beer-to-add.md).
- A beer's own details, tasting notes or ratings; Kalia collects no reviews.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), and
  the pickers are felt rather than seen, so the route is a native build
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- The rules are the API's: one to twenty-four bottles per add, both dates
  optional, a best-before date after the brewed date when both are present, and
  an edit that replaces the container and both dates but never the quantity
  ([`CellarController`](../../../backend/src/main/java/fi/kalia/cellar/web/CellarController.java)).
  The server stays the authority; the form refuses what it can before sending.
- No control needs a gesture, every control has a role and a name, and nothing
  sits in a fixed height around text
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); a
  picker is reachable with a screen reader on both platforms.
- A date is a day with no time zone, in the app's language.
- **A date-picker package is a new dependency:** asked about with its version
  before it is used ([`CLAUDE.md`](../../../CLAUDE.md)).
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Open questions

- **Dates a bottle does not have.** Many bottles carry only a best-before
  date, or only a year. Does the form accept a month or year, or a day only?
  The API takes a day.
- **Shortcuts.** Does the form offer "a year from the brewed date" or similar,
  or is that out of scope?
- **How many.** A stepper, a number field or a choice of common counts (a
  six-pack, a case)?
- **The container's default,** and whether a can or a keg is a visual
  choice at all or a field the user rarely touches.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the quantity
      control and how the two dates are entered and cleared, each felt on both
      platforms; a design record holds the directions and the choice
- [ ] A component test finds every control and the submit and cancel actions by
      role and accessible name
- [ ] A component test shows submit reporting the chosen values once, a
      best-before date not after the brewed one refused with its message, and
      a quantity outside one to twenty-four refused
- [ ] A component test shows the form with a long Finnish beer name at the
      largest font scale reading in full
- [ ] `docs/design.md` carries the chosen form as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [ ] The product owner signed off the built form live, on both platforms
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Add bottles of a beer —
quantity, brewed and best-before dates with the platform's own pickers").
