# Task 03: Cellar page and add-to-cellar from the catalog

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

With [task 02](02-cellar-rest-api.md) the cellar exists but only to something
that can speak HTTP. This task is what makes the iteration's goal true for an
actual person: seeing the beers you own, getting from a beer to the actual
bottles of it and how old each one is, and being able to add one while browsing
the catalog.

It is also the first UI in the app behind a sign-in, so it is where the
signed-in and signed-out views of the same page get settled.

## Scope

A cellar page listing the signed-in user's beers — one row per beer, opening
onto the individual bottles beneath it with their dates — and an add-to-cellar
affordance on the beer list and detail pages. Both locales, and the
loading/error/empty states the rest of the app already has.

## Non-goals

- Editing beyond the fields task 01 defines — no ratings, no tasting notes.
- Any cellar view for a signed-out visitor beyond a prompt to sign in.
- Making a cellar public, or viewing anyone else's —
  [iteration 6](../iteration-6.md).

## Constraints

- Server components by default; a client component only where interaction
  needs one ([frontend/README.md](../../../frontend/README.md) conventions).
- Mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the feature's own `api.ts`
  wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md) — a `loading.tsx`
  with a shape-matched skeleton, and `EmptyState` for a cellar with nothing in
  it.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers rather than a new gate.

## Open questions

The product owner wants to take part in the UI/UX decisions here, so these
are for that conversation rather than for an agent to settle.

1. **How is a cellar entry presented?** The catalog uses a list of linked
   cards. The cellar carries more per beer — bottle count, dates, purchase
   price, notes — which suits a table, but a table is the weaker shape on a
   phone. Same visual language as the catalog, or a deliberately different
   one?
2. **How do the two levels meet on screen?** An expandable row keeps everything
   on one page; a separate page per beer gives the bottles room but costs a
   navigation. This is the question the whole page hangs on.
3. **What is on the beer row, and what is on a bottle row?** Candidates for
   the beer line: name, brewery, style, ABV, how many bottles, the soonest
   best-before among them. The bottle line is likely dates plus whatever
   task 01 decides a bottle carries.
4. **How are the dates shown** — "brewed 2024", "3 years old", "best before in
   8 months", or some combination? And what does a bottle with neither date
   show?
5. **Default order** of beers, and of bottles within a beer, and whether
   sorting is needed at all in the first version: recently added, name, age,
   or soonest best-before?
6. **Where does add-to-cellar sit** on the beer list and the beer detail page,
   and how much does it ask for? Adding a bottle needs dates, so it cannot be
   a single button — inline form, dialog, or a dedicated page?
7. **What does a signed-out visitor see** on `/cellar`: a sign-in prompt on
   the page, or a redirect to sign-in and back?
8. **Should this task's scope split?** As written, it bundles five "firsts"
   in one PR: the first real TanStack Query use, the first Zustand store (if
   this UI needs one), the first stateful react-hook-form + Zod form, the
   first cross-feature dependency (the add-to-cellar affordance reaching into
   `catalog`), and the first authenticated UI. A frontend-modularity review
   flagged this convergence as the iteration's largest risk. Splitting some of
   it into a preceding task is possible but shrinks this task's Scope and
   Non-goals accordingly — worth deciding before refinement, not during it.

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] A signed-in user sees their own cellar as one row per beer, and can get
      from a beer to its individual bottles and their dates — component tests
      (`*.test.tsx`) for populated, empty and error states
- [ ] Two bottles of the same beer with different dates appear under one beer
      and stay distinguishable — component test, because this is the whole
      point of the model and the easiest thing for a UI to flatten away
- [ ] Adding a bottle from the catalog puts it in the cellar without a full
      page reload, and the list reflects it — Playwright covers
      sign in → add → see it in the cellar
- [ ] Editing a bottle and removing one both work from the cellar page —
      same Playwright spec, continuing the journey
- [ ] A signed-out visitor is invited to sign in rather than shown an error or
      an empty cellar — component test
- [ ] Every rendered state passes `axe` with no violations, in both locales —
      `jest-axe` in component tests and `@axe-core/playwright` on the pages
      the E2E visits
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

The E2E journey here is the one iteration 5 originally listed as a separate
task; it belongs to the task that creates the behaviour
([ADR-0026](../../adr/0026-task-file-format.md)).
