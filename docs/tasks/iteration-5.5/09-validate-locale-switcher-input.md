# Task 09: Validate the locale parsed from the pathname

- **Status:** needs-refinement
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

## Open questions

- **Edge cases and failure handling:** what should `aria-current` and the
  active-locale styling show when the first path segment isn't a known
  locale (unreachable via app navigation, but this is exactly the case the
  fix exists to cover — it needs a defined answer, not silent `undefined`
  behavior)?

## Acceptance criteria

- [ ] `LocaleSwitcher` no longer contains an `as Locale` assertion
- [ ] A component test asserts behavior when the pathname's first segment
      isn't a valid locale, per the Open questions answer
- [ ] `npm test` is green

## Notes

Quality backlog: COULD-5.
