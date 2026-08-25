# Task 09: Validate the locale parsed from the pathname

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`frontend/features/i18n/LocaleSwitcher.tsx` reads the current locale as
`pathname.split("/")[1] as Locale` — an unvalidated type assertion, unlike
the rest of the codebase, which validates a path-derived locale through
`isLocale`/`toLocale` before trusting it.

The same file trusts that segment a second time when building its links:
`localeHref` overwrites `segments[1]` unconditionally, so a pathname whose
first segment is not a locale loses that segment rather than gaining a
prefix (`/beers` becomes `/en`, not `/en/beers`).

Neither is reachable through normal navigation today (the app's own routing
only ever produces `/en/...` or `/fi/...` paths), but it means this one
component trusts a value everywhere else in the codebase treats as needing
validation first — a real inconsistency, not merely defensive.

## Scope

`LocaleSwitcher` stops deriving the current locale from the pathname and
receives it as an already-validated `Locale`, the way its sibling header
components do. Its link construction prepends the locale to a pathname whose
first segment is not a known locale, instead of overwriting that segment.

## Non-goals

- Any change to routing or to `proxy.ts`'s locale-redirect behavior.
- Any change to how `SiteNav`, `AuthStatus` or `Providers` obtain their
  locale — this task makes `LocaleSwitcher` match them, not the reverse.

## Constraints

- Whatever `isLocale`/`toLocale` already do elsewhere in the codebase — this
  task reuses that, not a new validation scheme.
- The current locale reaches `LocaleSwitcher` as a `locale: Locale` prop
  from `app/[locale]/layout.tsx`, which already resolves it with
  `toLocale(params.locale)` — the same wiring `SiteNav` and `AuthStatus`
  use. The assertion is removed by deleting the derivation, not by
  validating it in place. Product owner, 2026-08-25.
- `usePathname()` stays in the component, used only to build the target
  hrefs.
- Because the layout resolves the locale, the active-locale marking
  (`aria-current="page"` and the active styling) always agrees with the
  content around it: on a pathname whose first segment is not a known
  locale, the layout renders in `defaultLocale`, so that is the locale
  marked. There is no state in which neither link is marked.
- `localeHref` replaces the first path segment when it is a known locale and
  prepends `/{locale}` when it is not. Product owner, 2026-08-25.
- No ADR. The behavior is stated by the component's signature and its tests,
  so it does not meet [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s
  bar of a reason that would not survive in the code. Product owner,
  2026-08-25.

## Open questions

**None.**

## Acceptance criteria

- [ ] `LocaleSwitcher` contains no `as Locale` assertion and no locale
      derivation — it takes a `locale: Locale` prop, supplied by
      `app/[locale]/layout.tsx`
- [ ] A component test asserts that the locale given as the prop is the one
      carrying `aria-current="page"` and the active styling, and that this
      holds independently of the pathname
- [ ] A component test asserts `localeHref` prepends rather than overwrites
      when the pathname's first segment is not a known locale (`/beers` →
      `/en/beers`), and still replaces it when it is (`/fi/beers` →
      `/en/beers`)
- [ ] `(cd frontend && npm test)` is green

## Notes

Quality backlog: COULD-5.

[ADR-0022](../../adr/0022-loading-error-empty-states.md)'s Evidence section
already cites this defect as the reason `Providers` takes a `locale` prop
rather than deriving one — it names it `COULD-6`, which is a different
finding. Correct that reference to `COULD-5` in the implementing PR, under
its doc-sync gate.
