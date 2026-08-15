# Task 13: Add a bottle to the cellar from the catalog

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)
- **Covers:** DW-1

## Why

With [task 11](11-cellar-page.md) there is somewhere to see a cellar, but
no way to put anything in it short of calling the API directly. This is the
point where the frontend's `catalog` and `cellar` features first depend on
each other — the add-to-cellar affordance on catalog's pages reaching into
`cellar` — and where the app's first stateful form (bottle dates, via
react-hook-form + Zod) gets built.

## Scope

An add-to-cellar affordance on the beer list and beer detail pages (in
`catalog`), capturing whatever dates a bottle carries, that adds it to the
signed-in user's cellar without a full page reload. Both locales,
loading/error states for the mutation.

## Non-goals

- The cellar page that shows the result — [task 11](11-cellar-page.md).
- Editing or removing an existing bottle —
  [task 14](14-edit-remove-bottle.md).
- Making a cellar public, or viewing anyone else's —
  [iteration 6](../iteration-6.md).

## Constraints

- Client component for the form (interaction).
- react-hook-form + Zod for the form — first use of either in the app.
- Mutation goes through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the cellar feature's
  own `api.ts` wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- This is the frontend's first cross-feature dependency (`catalog` →
  `cellar`) — subject to whatever [task 05](05-enforce-frontend-module-boundaries.md)
  and [task 06](06-feature-public-surfaces.md) land for the
  boundary/public-surface mechanism, if either lands first. Otherwise the
  dependency direction (catalog may depend on cellar, not the reverse)
  still applies, and the missing automated enforcement is a known gap, not
  a blocker.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers rather than a new gate.

## Open questions

1. **Where does add-to-cellar sit** on the beer list and the beer detail
   page, and how much does it ask for? Adding a bottle needs dates, so it
   cannot be a single button — inline form, dialog, or a dedicated page?
2. **Does this task decide the catalog→cellar boundary mechanism itself**,
   or is that owned by whichever of [task 05](05-enforce-frontend-module-boundaries.md)
   / [task 06](06-feature-public-surfaces.md) lands first — a sequencing
   question those tasks already ask from their side?

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] Adding a bottle from the catalog puts it in the cellar without a full
      page reload, and the cellar list reflects it — Playwright covers
      sign in → add → see it in the cellar
- [ ] Invalid or missing required dates are rejected with an inline error
      before submission — component test
- [ ] The add affordance and its form pass `axe` with no violations, in
      both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.
