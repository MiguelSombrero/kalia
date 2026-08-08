# Task 03: Front page feed

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)

## Why

Kalia's front page is a title, a tagline and a button to the catalog. It says
nothing about what the app is for and gives a returning user no reason to open
it.

With [task 02](02-feed-api.md) there is finally something to put there: what
people are actually doing with their cellars. This task is what turns the feed
from a table into the thing a visitor sees first, and it is where a public
cellar gets found by someone who was not sent a link.

## Scope

Replacing the front page's static content with the feed: recent events,
newest-first, each reading as a sentence about a person and a beer, with a link
to a public cellar where there is one. Both locales, and the loading, error and
empty states — including the empty state that a brand-new installation shows.

## Non-goals

- Liking or commenting on an event — [backlog](../backlog.md).
- Filtering or personalising the feed.
- Removing the catalog entry point. Browsing beers stays reachable from the
  front page.

## Constraints

- Server components by default; a client component only where interaction needs
  one ([frontend/README.md](../../../frontend/README.md) conventions). A feed
  that only renders does not need the client.
- The feature package follows whatever
  [iteration 5 task 06](../iteration-5/06-feature-public-surfaces.md) settles
  for public surfaces, and the boundaries
  [task 05](../iteration-5/05-enforce-frontend-module-boundaries.md) enforces.
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md) — a `loading.tsx`
  with a shape-matched skeleton, `EmptyState` for a feed with nothing in it.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)). **A feed line is a
  sentence with a person and a beer in it, so it is the first copy in Kalia
  where Finnish word order and case endings will not survive naive
  interpolation** — this is the trap ADR-0011 already names for plurals, one
  level harder.
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  WCAG 2.1 AA at the three existing layers.

## Open questions

The product owner wants a say here: this is the first thing anyone sees.

1. **What does a feed line say, in both languages?** "Miguel Sombrero added
   AleSmith IPA to his cellar" is the vision's example. The exact wording,
   including how a private cellar's line reads if it appears at all, wants
   writing rather than defaulting.
2. **How is time shown** — "2 hours ago", a date, or nothing?
3. **What does the front page look like around the feed?** Is the feed the
   whole page now, or does the title, tagline and catalog button stay above it?
4. **What does a visitor see when the feed is empty** — the old static front
   page, or an empty state? A brand-new Kalia has an empty feed, so this is the
   first impression, not an edge case.
5. **Is there a link to see more**, or does the front page's list end?
6. **Does an avatar or any image belong on a line?** Nothing in Kalia has
   images today, and adding them here is a larger change than it looks.

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] The front page renders recent events newest-first for a signed-out
      visitor — component tests (`*.test.tsx`) for populated, empty and error
      states
- [ ] An event from a public cellar links to it and one from a private cellar
      does not — component test asserting no link is rendered in the second
      case, confirmed to fail against a version that always links
- [ ] Feed lines read correctly in both `en` and `fi`, including a name and a
      beer in the same sentence — component test per locale
- [ ] Playwright covers sign in → add a bottle → see it appear on the front
      page → follow the link to the public cellar
- [ ] Every rendered state passes `axe` with no violations, in both locales —
      `jest-axe` in component tests and `@axe-core/playwright` on the pages the
      E2E visits
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
