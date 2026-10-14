# Task 18: Empty states and the sign-in prompt each have one shape

- **Status:** done
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

`EmptyState` takes the cellar's ruled shape, and the catalog's empty search and
both cellar views render through it. A sign-in prompt is one primitive in
`components/ui/` that the cellar and the profile each fill with their own
strings and Server Action. `card.tsx` is removed.

## Non-goals

- The front page feed's empty state. It is a rack of hairline cells chosen in
  [ADR-0068](../../adr/0068-front-page-one-column-cellar-or-pitch-above-a-ruled-feed.md),
  not a message block.
- Any wording. Copy is out of scope for the iteration
  ([iteration 7.5](../iteration-7.5.md)).
- The skeletons ([ADR-0022](../../adr/0022-loading-error-empty-states.md)),
  which already share one primitive.
- The look of a section heading, which
  [task 17](17-one-title-and-one-heading-style.md) settles.

## Constraints

- `components/ui/` imports from `lib/` only, so a shared sign-in prompt takes
  its strings and its Server Action from the caller rather than importing a
  feature's (`frontend/eslint.config.mjs`).
- Sign-in is a Server Action, not a post to a route handler, so the CSP's
  `form-action 'self'` stays strict
  ([ADR-0025](../../adr/0025-authjs-valkey-adapter.md)).
- Styling stays inside the semantic token layer
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)).

Decided in refinement on 2026-10-11, together with task 17:

- **Task 17 comes first, and this task builds on it.** The heading in an
  empty state and in the sign-in prompt is a `SectionHeading` in its `heading`
  look, at the level the caller passes. Task 17 has already moved the four
  hand-written headings to it in place; this task moves them into the
  primitives.
- **The cellar's ruled block wins.** A top rule, a `SectionHeading`, a muted
  hint, then optional content and an action, as ADR-0070 laid out. No
  `design-task` round: the product owner chose this shape in ADR-0070, and the
  catalog mockup chosen in ADR-0069 (A3) had a ruled block for the empty
  search too; the dashed card was kept only by agreement. The catalog's empty
  search changes visibly, and ADR-0069's "by agreement" difference is amended
  to say it was closed here
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **The sign-in prompt is the same shape.** It is built from `EmptyState`
  rather than as a second block, with a sign-in button posting to the caller's
  Server Action and a link to sign-up.
- **`card.tsx` is removed.** Once `EmptyState` stops using `cardVariants`, its
  only users are the feed's two status rows, in one file. They get a local
  constant in `FeedList`, and nothing imports `components/ui/card`.
- **This task stays in iteration 7.5.** It consumes task 17's
  `SectionHeading` and changes surfaces this iteration redesigned. No
  `Done when` criterion depends on it, so it covers none.

## Open questions

**None.**

## Acceptance criteria

- [x] The catalog's empty search and both cellar views' empty states render
      through `EmptyState` in the ruled shape, covered by its colocated test
      with a `jest-axe` assertion, and seen in a browser at both agreed widths
      in both locales
- [x] One sign-in prompt primitive serves the cellar and the profile, each
      signing in with its own Server Action, covered by a component test, and
      exercised in a browser signed out on both pages
- [x] `components/ui/card.tsx` is gone and nothing imports it
- [x] [Task 13](13-accessibility-and-contrast-reverified.md)'s Playwright
      accessibility scans and heading-structure test pass against the changed
      pages
- [x] ADR-0069 is amended to record that the empty search left the dashed card
- [x] `make verify` is green

## Notes

Written by [task 12](12-do-we-need-a-design-system.md) on 2026-10-11, at the
product owner's request that the drift its inventory found be scheduled rather
than only recorded. Refined on 2026-10-11 together with
[task 17](17-one-title-and-one-heading-style.md).
