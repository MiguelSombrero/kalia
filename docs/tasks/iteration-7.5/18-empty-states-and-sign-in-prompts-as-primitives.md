# Task 18: Empty states and the sign-in prompt each have one shape

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** none

## Why

[Task 12](12-do-we-need-a-design-system.md)'s inventory
([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)
Evidence) found three things in `components/ui/` and around it that no longer
match how the app is built:

- **Two empty states.** The catalog's empty search uses `EmptyState`, a
  dashed, centred card older than the identity. It was kept there by agreement
  in [ADR-0069](../../adr/0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md).
  The own and public cellars build a different empty state by hand, laid out
  new in [ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md).
  The shared primitive is the one that is out of date.
- **Two sign-in prompts.** `features/cellar/SignInPrompt.tsx` and
  `features/profile/SignInPrompt.tsx` are the same component with different
  strings and Server Actions. Features cannot import each other, so a second
  copy was the only route short of a primitive.
- **A `Card` nobody renders.** `Card` has no users. `cardVariants` survives in
  the feed and inside `EmptyState`.

Under ADR-0073, a look that recurs becomes one primitive, and a primitive that
stopped recurring is not kept as if it might.

## Scope

An empty state has one shape across the app, and the catalog and both cellar
views use it. A sign-in prompt is one primitive that the cellar and the profile
each fill with their own strings and action. `Card` is either removed or kept
for a named use.

## Non-goals

- The front page feed's empty state. It is a rack of hairline cells chosen in
  [ADR-0068](../../adr/0068-front-page-one-column-cellar-or-pitch-above-a-ruled-feed.md),
  not a message block.
- Any wording. Copy is out of scope for the iteration
  ([iteration 7.5](../iteration-7.5.md)).
- The skeletons ([ADR-0022](../../adr/0022-loading-error-empty-states.md)),
  which already share one primitive.

## Constraints

- `components/ui/` imports from `lib/` only, so a shared sign-in prompt takes
  its strings and its Server Action from the caller rather than importing a
  feature's (`frontend/eslint.config.mjs`).
- Sign-in is a Server Action, not a post to a route handler, so the CSP's
  `form-action 'self'` stays strict
  ([ADR-0025](../../adr/0025-authjs-valkey-adapter.md)).
- Styling stays inside the semantic token layer
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)).

## Open questions

- **Which empty state wins?** The cellar's ruled block, the catalog's dashed
  card, or a third shape. ADR-0069 kept the dashed card by agreement. Choosing
  between built alternatives is a `design-task` round, which would make this
  `Kind: design`.
- **`Card`: remove, or keep for the feed?** The feed's "N new" and error rows
  are the only places that still wear its classes.
- **Does this belong in iteration 7.5?** No `Done when` criterion requires it.
  It could equally open [iteration 8](../iteration-8.md), where the
  add-a-beer form is the first new screen to reach for these primitives.

## Acceptance criteria

- [ ] The catalog's empty search and both cellar views' empty states render
      through one primitive, covered by that primitive's colocated test with a
      `jest-axe` assertion and seen in a browser at both agreed widths
- [ ] One sign-in prompt primitive serves the cellar and the profile, each
      signing in with its own Server Action, covered by a component test, and
      exercised in a browser signed out on both pages
- [ ] `Card` is either gone with no remaining import, or kept and used by name
      for the reason the product owner gives
- [ ] `make verify` is green

## Notes

Written by [task 12](12-do-we-need-a-design-system.md) on 2026-10-11, at the
product owner's request that the drift its inventory found be scheduled rather
than only recorded.
