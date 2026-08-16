# Task 11: Cellar page for the signed-in user

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)
- **Covers:** DW-2, DW-3

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
- One page, no separate per-beer route: each beer is a row that expands in
  place to reveal its bottles. The exact visual treatment — cards in the
  catalog's visual language, a lighter accordion style, or something between
  — is deliberately left open: prototype a couple of options during
  implementation and get product-owner sign-off before finalizing, rather
  than locking a specific component shape here.
- Beer row shows: name, brewery, style, ABV, bottle count (derived by
  counting, per [task 01](01-cellar-module-and-schema.md)). No price and no
  notes on either the beer or bottle row — task 01 has no notes field at
  all, and price was intentionally not carried over from the catalog card.
- Bottle row shows: brewed date, best-before date (both nullable per task
  01), and container type. A bottle with neither date shows container type
  only — no placeholder text.
- Both dates render as relative time in both locales, e.g. "brewed 3 years
  ago", "best before in 8 months" / "best before 2 months ago" once past.
- Default order: beers alphabetically by name; bottles within a beer by
  brewed date, oldest first. Best-before date does not drive ordering —
  cellar-worthy beers commonly outlive it, so brewed date is the more
  meaningful signal for an enthusiast than best-before.
- Signed-out visitor at `/cellar`: the server component checks `auth()` and
  renders an in-page sign-in prompt in place of the list. No redirect-based
  route protection is introduced by this task.
- Expand/collapse is local component state via plain `useState`, not
  persisted across navigation. No Zustand store for this task.

## Open questions

**None.**

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
