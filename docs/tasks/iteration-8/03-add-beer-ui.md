# Task 03: Adding a beer from search

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

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

## Non-goals

- Editing a beer, unless [task 01](01-catalog-data-source.md) put editing in
  the model.
- A moderation UI, if moderation was chosen. Its own task.
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
  [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.1 AA at the
  three existing layers.

## Open questions

The product owner wants a say in the interaction and the copy here.

1. **Where does the affordance live?** On the empty search result, in the
   navigation, on both? The empty state is where the need is felt; a permanent
   entry point is findable when the need is remembered later.
2. **Is the form a page or a dialog?** A page survives a reload and can be
   linked; a dialog keeps the search behind it.
3. **Does the search term carry into the form?** Someone who just searched
   "Bigfoot" should not retype it — but the search box holds a query, not
   necessarily a beer name.
4. **What happens after the beer is created** — land on its detail page, return
   to the search, or go straight to adding a bottle of it to the cellar? The
   third is what the user actually wanted, and it is the one that couples this
   task to the cellar.
5. **How is a duplicate presented?** "That beer already exists" with a link is
   the useful version, and it depends on what
   [task 02](02-add-beer-api.md) question 2 decides the API returns.
6. **How much does the form ask for?** Every optional field it shows is a field
   most contributors will leave blank, and a form that asks for little produces
   a catalog that says little.

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] A signed-in user who searches for a beer that does not exist can reach
      the form from that empty state — component test, and Playwright covering
      the route
- [ ] Submitting a valid beer creates it, and the user reaches it without a
      full page reload — Playwright covering search → not found → add →
      the new beer, continuing into adding a bottle of it to the cellar
- [ ] Submitting a duplicate shows the agreed message rather than a generic
      error or a second beer — component test with the API's duplicate
      response
- [ ] Invalid input is caught client-side, and a server-side rejection the
      client did not predict is still shown to the user rather than swallowed —
      component test for the second case, confirmed to fail against a form that
      only handles its own validation
- [ ] A signed-out visitor is invited to sign in rather than shown a form that
      will fail — component test
- [ ] Every rendered state passes `axe` with no violations, in both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
