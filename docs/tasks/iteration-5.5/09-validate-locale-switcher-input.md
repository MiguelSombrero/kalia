# Task 09: Validate the locale parsed from the pathname

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`frontend/features/i18n/LocaleSwitcher.tsx` reads the current locale as
`pathname.split("/")[1] as Locale` — an unvalidated type assertion, unlike
the rest of the codebase, which validates a path-derived locale through
`isLocale`/`toLocale` before trusting it.

Not reachable through normal navigation today (the app's own routing only
ever produces `/en/...` or `/fi/...` paths), but it means this one component
trusts a value everywhere else in the codebase treats as needing validation
first — a real inconsistency, not merely defensive.

## Scope

`LocaleSwitcher` derives the current locale using the same
`isLocale`/`toLocale` validation the rest of the codebase uses, with a
defined fallback for a pathname that doesn't start with a known locale.

## Non-goals

- Any change to routing or to `proxy.ts`'s locale-redirect behavior.

## Constraints

- Whatever `isLocale`/`toLocale` already do elsewhere in the codebase — this
  task reuses that, not a new validation scheme.
- When the pathname's first segment isn't a known locale, no locale link
  gets `aria-current="page"` or the active-locale styling — `aria-current`
  asserts that a link represents the currently displayed page (WAI-ARIA;
  WCAG 4.1.2 Name, Role, Value), and the current locale genuinely isn't
  known in that case. This intentionally diverges from `toLocale`'s
  fallback-to-`defaultLocale` convention used elsewhere in the codebase,
  where the fallback stands in for routing/rendering rather than an
  accessibility-facing "you are here" claim.

## Open questions

**None.**

## Acceptance criteria

- [ ] `LocaleSwitcher` no longer contains an `as Locale` assertion
- [ ] A component test asserts that when the pathname's first segment isn't
      a valid locale, neither locale link has `aria-current` and neither
      gets the active-locale styling
- [ ] `npm test` is green

## Notes

Quality backlog: COULD-5.
