# Task 03: Adding a beer from search

- **Status:** done
- **Iteration:** [8](../iteration-8.md)
- **Kind:** design

## Why

[Task 02](02-add-beer-api.md) lets a beer be created over HTTP, but a user only
ever discovers the catalog is missing something at one moment: when they search
for the beer in their hand and it is not there. Today that search returns an
empty state and a dead end.

This task turns that dead end into the way the catalog grows. Where the
affordance sits is most of the design: an "add a beer" link buried in a menu is
a feature nobody finds, and one attached to a failed search is a feature nobody
has to look for.

## Scope

Adding a beer to the catalog from the app — the form, its validation, and the
route from a search that found nothing to that form and back to the beer that
now exists. Both locales, and the loading, error and duplicate states.

The interaction is a design choice the product owner makes from built
alternatives, not one settled in advance. At least three questions are decided
that way:

- where the "add a beer" affordance lives: on the empty search result, on the
  catalog page, in the navigation, or some combination;
- whether the form is its own page or a dialog over the search;
- where the user lands once the beer exists, for example its detail page, the
  search, or straight into adding a bottle.

The directions built for that choice also show how the form does three things
it must: carry the search term in, show the brewery's similarly named beers
before the user submits, and create a brewery the catalog lacks without
leaving the form.

## Non-goals

- Editing a beer. [Task 01](01-catalog-data-source.md) decided that iteration
  8 only adds beers; editing is in the [backlog](../backlog.md).
- A moderation UI. Task 01 decided that an added beer is visible to everyone
  at once.
- Scanning a barcode into the form — [iteration 14](../iteration-14.md).
- The Wikidata credit, which [task 17](17-seed-the-catalog-from-wikidata.md)
  places.
- Adding a beer straight into the cellar in one step, skipping the catalog. The
  beer exists for everyone; the bottle is yours. Collapsing the two hides that.

## Constraints

- **This task cannot be refined before [task 01](01-catalog-data-source.md) is
  done**, for the same reason as [task 02](02-add-beer-api.md).
- The form is stateful and validated, so it is react-hook-form + Zod
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)) — not a native GET form,
  which is only for navigation. The catalog's existing `SearchFilters` stays a
  server component and is untouched.
- Mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the feature's own `api.ts`
  wrapper over the generated client; failures surface as a tagged `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Client-side validation mirrors the backend's rules and does not replace them.
  The server is the authority; a Zod schema that has quietly drifted from the
  Bean Validation constraints produces a form that rejects valid beers or
  accepts invalid ones.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy,
  including validation messages.
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  loading/error/empty states per
  [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.2 AA at the
  three existing layers.
- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)). It
  runs under the `design-task` skill: directions are built, the product owner
  chooses, an ADR records the choice, and the same task then builds it.
  Choices already recorded in [`docs/design.md`](../../design.md) and
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)'s
  page shell bind every direction.

**Decided at refinement, 2026-10-15** (product owner):

- **The form asks for what [task 02](02-add-beer-api.md) requires and nothing
  more:** a name, a brewery, a style and an ABV. The brewery is picked, or
  created in the form with a name, a country from a list and an optional
  city. The style is picked from the catalog's styles. There is no
  description field.
- **A duplicate beer says the beer is already in the catalog and links to
  it**, built on task 02's `409` carrying the existing beer's id. A duplicate
  brewery is handled the same way. Neither is shown as a generic error.
- **A beer's page does not say who added it.** Showing the contributor was
  rejected. Cellars are private by default, and a username on the page of
  every beer a user added would expose them where they may not expect it.
  The contributor is recorded only for tracing and removal, and
  [task 02](02-add-beer-api.md) keeps it out of every read response.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum where the
      affordance lives, whether the form is a page or a dialog, and where the
      user lands after creating the beer. An ADR records the directions and
      the choice, and the product owner signed off the built flow in the
      browser pane at both agreed widths
- [x] A signed-in user who searches for a beer that does not exist can reach
      the form from that empty state, with the search term carried into it —
      component test, and Playwright covering the route
- [x] Submitting a valid beer creates it, and the user lands where the chosen
      direction says without a full page reload — Playwright covering search →
      not found → add → the new beer, continuing into adding a bottle of it to
      the cellar
- [x] A beer whose brewery the catalog lacks can be added, creating the
      brewery in the same flow — Playwright
- [x] The brewery's similarly named beers are shown before submitting —
      component test
- [x] Submitting a duplicate says the beer is already in the catalog and links
      to it, rather than showing a generic error or creating a second beer —
      component test with the API's `409` response
- [x] Invalid input is caught client-side, and a server-side rejection the
      client did not predict is still shown to the user rather than swallowed —
      component test for the second case, confirmed to fail against a form that
      only handles its own validation
- [x] A signed-out visitor is invited to sign in rather than shown a form that
      will fail — component test
- [x] Every rendered state passes `axe` with no violations, in both locales and
      at both agreed widths
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
