# Task 03: Cellar page and add-to-cellar from the catalog

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)

## Why

With [task 02](02-cellar-rest-api.md) the cellar exists but only to something
that can speak HTTP. This task is what makes the iteration's goal true for an
actual person: seeing the beers you own, with the age that makes a cellar worth
keeping, and being able to add one while browsing the catalog.

It is also the first UI in the app behind a sign-in, so it is where the
signed-in and signed-out views of the same page get settled.

## Scope

A cellar page listing the signed-in user's beers with age, quantity and
details, and an add-to-cellar affordance on the beer list and detail pages.
Both locales, and the loading/error/empty states the rest of the app already
has.

## Non-goals

- Editing beyond quantity and the fields task 01 defines — no ratings, no
  tasting notes beyond the existing `notes` field.
- Any cellar view for a signed-out visitor beyond a prompt to sign in.

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

**None.**

## Acceptance criteria

- [ ] A signed-in user sees their own cellar with each beer's age derived from
      its vintage year, plus quantity and details — component tests
      (`*.test.tsx`) for populated, empty and error states
- [ ] Adding a beer from the catalog puts it in the cellar without a full page
      reload, and the list reflects it — Playwright covers
      sign in → add → see it in the cellar
- [ ] Editing quantity and removing an item both work from the cellar page —
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
