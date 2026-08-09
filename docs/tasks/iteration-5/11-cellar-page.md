# Task 11: Cellar page for the signed-in user

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

With [task 02](02-cellar-rest-api.md) the cellar exists but only to
something that can speak HTTP. This task makes it real for a person: seeing
the beers you own and getting from a beer to the actual bottles of it and
how old each one is. It is also the first UI in the app behind sign-in, so
it is where the signed-in and signed-out views of the same page get settled.

## Scope

A cellar page listing the signed-in user's beers — one row per beer,
opening onto the individual bottles beneath it with their dates. Both
locales, and the loading/error/empty states the rest of the app already
has. What a signed-out visitor sees at `/cellar`.

## Non-goals

- Adding, editing or removing a bottle —
  [task 13](13-add-bottle-to-cellar.md), [task 14](14-edit-remove-bottle.md).
- Getting to `/cellar` from anywhere else in the UI —
  [task 12](12-cellar-navigation.md).
- Making a cellar public, or viewing anyone else's —
  [iteration 6](../iteration-6.md).

## Constraints

- Server components by default; a client component only where interaction
  needs one ([frontend/README.md](../../../frontend/README.md) conventions).
- Reads go through TanStack Query ([ADR-0008](../../adr/0008-tanstack-query.md))
  and the feature's own `api.ts` wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md) — a `loading.tsx`
  with a shape-matched skeleton, and `EmptyState` for a cellar with nothing
  in it.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers rather than a new gate.
- This is the first `features/cellar/` frontend package — subject to
  whatever [task 05](05-enforce-frontend-module-boundaries.md) and
  [task 06](06-feature-public-surfaces.md) land for module boundaries and
  public surfaces, if either lands first.

## Open questions

1. **How is a cellar entry presented?** The catalog uses a list of linked
   cards. The cellar carries more per beer — bottle count, dates, purchase
   price, notes — which suits a table, but a table is the weaker shape on a
   phone. Same visual language as the catalog, or a deliberately different
   one?
2. **How do the two levels meet on screen?** An expandable row keeps
   everything on one page; a separate page per beer gives the bottles room
   but costs a navigation. This is the question the whole page hangs on.
3. **What is on the beer row, and what is on a bottle row?** Candidates for
   the beer line: name, brewery, style, ABV, how many bottles, the soonest
   best-before among them. The bottle line is likely dates plus whatever
   task 01 decides a bottle carries.
4. **How are the dates shown** — "brewed 2024", "3 years old", "best before
   in 8 months", or some combination? And what does a bottle with neither
   date show?
5. **Default order** of beers, and of bottles within a beer, and whether
   sorting is needed at all in the first version: recently added, name,
   age, or soonest best-before?
6. **What does a signed-out visitor see** on `/cellar`: a sign-in prompt on
   the page, or a redirect to sign-in and back? No route-protection
   mechanism exists yet for any page in the app, so this task also decides
   how that gate works.
7. **Does this page need local UI state** (e.g. expanded/collapsed rows)?
   If so, this is the frontend's first real Zustand use — or plain
   `useState` may be enough. Worth the product owner's call only if it
   affects UX, e.g. whether expand state should persist across navigation.

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] A signed-in user sees their own cellar as one row per beer, and can
      get from a beer to its individual bottles and their dates —
      component tests (`*.test.tsx`) for populated, empty and error states
- [ ] Two bottles of the same beer with different dates appear under one
      beer and stay distinguishable — component test, because this is the
      whole point of the model and the easiest thing for a UI to flatten
      away
- [ ] A signed-out visitor is invited to sign in rather than shown an error
      or an empty cellar — component test
- [ ] Every rendered state passes `axe` with no violations, in both locales
      — `jest-axe` in component tests
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.
