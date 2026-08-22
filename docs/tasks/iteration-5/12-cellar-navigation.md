# Task 12: Navigation between Home, Catalog and Cellar

- **Status:** done
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
- Top bar: the three links extend the existing `<header>` in
  `app/[locale]/layout.tsx`, staying inline and wrapping onto a second line
  on narrow screens if needed. No hamburger/drawer or bottom tab bar —
  three items don't warrant a new interaction pattern.
- Links (Home, Catalog, Cellar) sit to the left within that header;
  `AuthStatus` and `LocaleSwitcher` keep their current right-aligned
  position.
- The Cellar link is always shown, including to signed-out visitors —
  clicking it lands on [task 11](11-cellar-page.md)'s existing in-page
  sign-in prompt at `/cellar`. The nav's shape doesn't change with auth
  state.
- Current page is indicated by reusing `LocaleSwitcher`'s existing
  active-link pattern — `aria-current="page"` plus underline and
  font-weight, not color alone. A link is active for its whole section via
  prefix match on the pathname, so a nested route (e.g. a beer detail page)
  still marks its parent link (Catalog) active.

## Open questions

**None.**

## Acceptance criteria

- [x] A user can reach Home, Catalog and Cellar from any of those pages —
      Playwright covers navigating between all three
- [x] The current page is indicated in the nav — component test
- [x] The nav is keyboard-operable and passes `axe` with no violations, in
      both locales — `jest-axe` / `@axe-core/playwright`
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.
