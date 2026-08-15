# Task 12: Navigation between Home, Catalog and Cellar

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

There are now three pages — home, catalog, and (once
[task 11](11-cellar-page.md) lands) cellar — and no way to move between
them except typing a URL. Splitting [task 03](03-cellar-frontend.md)
surfaced this gap explicitly: navigation was never its own concern, it was
going to be improvised inside the cellar page. It needs a plan of its own
now that a second real, sign-in-gated destination exists.

## Scope

A navigation element reachable from every page, linking Home, Catalog and
Cellar, with the current page indicated. Placement of the already-existing
`AuthStatus` (login/logout) and `LocaleSwitcher` relative to the new links.

## Non-goals

- The content of any page the nav links to.
- Changing how `AuthStatus` or `LocaleSwitcher` behave internally (sign-in
  flow, locale switching logic) — only where they sit.

## Constraints

- Reuse the existing `AuthStatus` and `LocaleSwitcher` components rather
  than rebuilding them.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA — keyboard-operable, visible focus, current page indicated by
  more than color alone.

## Open questions

1. **What nav component** — top bar, side bar, tabs, something else — and
   how does it behave on mobile?
2. **Where do `AuthStatus` and `LocaleSwitcher` sit** relative to the new
   links?
3. **Is the Cellar link shown to signed-out visitors** (leading to
   [task 11](11-cellar-page.md)'s sign-in prompt) or hidden until signed
   in?
4. **How is the current page indicated?**

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] A user can reach Home, Catalog and Cellar from any of those pages —
      Playwright covers navigating between all three
- [ ] The current page is indicated in the nav — component test
- [ ] The nav is keyboard-operable and passes `axe` with no violations, in
      both locales — `jest-axe` / `@axe-core/playwright`
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.
