# Task 23: Design the catalog's search and filters

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1, DW-3
- **Kind:** design

## Why

The Catalog tab has no search and no filters, and the API has six ways to
narrow it: text, style, brewery, country, a strength range and a sort. The web
answers with a form and a fold ([ADR-0069](../../adr/0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md)),
which is a page's answer; [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)
left the search and filter row out of the identity on purpose, and
[ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)
fixed only that the filters are a sheet.

What is left is interface the product owner wants to choose between built
alternatives rather than accept from a task file: how the filters in force are
shown on the list, and how a style, a brewery or a country is picked when the
catalog holds dozens of styles and a list of breweries that grows with it.

## Scope

The search field on the Catalog screen, the filter sheet, and how the filters
in force are shown on the list: the controls for style, brewery, country,
strength range and sort, built as working components over local state, in
directions shown on the real catalog screens — the list, the sheet, a picker
open, filters in force — in both locales and at the largest text size, on both
platforms' conventions where they differ. Standing intent goes in
[`docs/design.md`](../../design.md).

## Non-goals

- Wiring the controls to the API — debounce, paging, the list's states, what is
  remembered and links into the screen — is [task 09](09-catalog-search-and-list.md).
- A beer's own page — [task 10](10-beer-details.md); the list's rows —
  [task 03](03-design-kalias-identity-on-a-phone.md).
- Saved searches, search history and suggestions.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it. It runs after [task 08](08-mobile-ui-primitives.md), and builds
  from its primitives.
- The filters are a sheet with an explicit close as well as native dismissal
  ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)).
  The identity is [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)'s;
  a direction that contradicts it is a new decision.
- WCAG 2.2 AA in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): no
  control needs a drag or a gesture, every control has a role and a name, and
  nothing sits in a fixed height around text.
- Every value sent is bounded as the API bounds it
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)): the text's
  length, a strength between zero and the API's maximum.
- A style or sort the server adds later is shown, not dropped
  ([task 18](18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- New dependencies are asked about before use
  ([`CLAUDE.md`](../../../CLAUDE.md)).

**Decided at refinement, 2026-11-12** (product owner):

- **The phone offers every filter the API has** — style, brewery, country and a
  strength range — **and every sort the web offers** (name ascending and
  descending, strength ascending and descending, style ascending).
- **The sheet holds its choices and applies them together:** one button that
  names the count it will show, and a "Clear all". Nothing re-queries the list
  while the sheet is open.
- **Strength is two number fields, from and to,** with a decimal keypad and a
  message when from is above to. No slider.
- **Which is the product owner's choice between alternatives:** how the
  filters in force are shown on the list (a row of removable chips, a count on
  the filter button, a result line, or others), how a style, a brewery and a
  country are picked (a single choice from the API's lists — `GET /styles`,
  `GET /breweries/countries`, and a searchable, paged `GET /breweries` — or
  typed text), and where the search field sits.
- **Names:** a style is shown as the catalog names it, as on the web; a country
  is named in the app's language by the platform's region names, verified on
  both platforms while building, with a bundled list only if a platform cannot.
- **This task builds the controls and not their data:** the components take
  and report values, and [task 09](09-catalog-search-and-list.md) wires them
  to the API.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum how the
      filters in force are shown and how a style, a brewery and a country are
      picked, each judged at the largest text size in both locales on the route
      task 01 chose; a design record holds the directions and the choice
- [x] A component test finds the search field, every filter control, the
      sheet's close and apply actions and each filter in force's removal by role
      and accessible name
- [x] A component test shows apply reporting the chosen values once, clear
      all emptying them, and a strength with from above to refused with its
      message
- [x] A component test renders the sheet and the filters in force with a long
      Finnish brewery and style name at the largest font scale, reading in full
- [x] `docs/design.md` carries the chosen search and filters as standing intent,
      and `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs`
      pass over them — test
- [ ] The product owner signed off the built controls live, next to the chosen
      direction
- [x] `make verify-fast` is green

## Notes

Added at the product owner's request during the 2026-11-12 refinement of tasks
09, 10 and 22: the decisions that task 09 held as open questions are design
choices, so they are made from built alternatives.
