# ADR-0011: i18next localization (English + Finnish)

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The frontend-standards iteration sets the localization approach before more
UI ships. Kalia serves both English and Finnish speakers; without a standard
each new page would invent its own approach.

## Decision

- **Locale-prefixed URLs**: every route lives under `app/[locale]/...`
  (`/en/beers`, `/fi/beers/{id}`). Shareable/bookmarkable per-language links,
  correct `<html lang>`, and the pattern nearly all Next.js App Router +
  i18next guides use. `[locale]/layout.tsx` is the de facto root layout
  (`<html>`/`<body>` live there — there is nothing outside `[locale]/` in
  the route tree).
- **`i18next` 26.3.6 + `i18next-resources-to-backend` 1.2.1** for server
  components (`i18n/server.ts`, `getTranslation(locale, namespace)` —
  a fresh `createInstance()` per call, safe under concurrent requests, no
  shared module-level state). Every current UI string is migrated; the
  translation resources live at `i18n/locales/{en,fi}/common.json`, one
  `common` namespace for now.
- **`react-i18next` 17.0.10 is installed but not yet wired** — no client
  component holds translated text today (the switcher only needs locale
  codes "EN"/"FI", which aren't translated). Follows the install-now,
  wire-later precedent from ADR-0009/ADR-0010; the client bridge
  (`I18nextProvider`, resource hydration from the server-resolved
  instance) is added when the first client component needs it.
- **`en` is the default locale.** `proxy.ts` (Next.js 16's renamed
  `middleware.ts` — see `frontend/AGENTS.md`) redirects locale-less
  requests to `/{locale}` by hand-parsing the `Accept-Language` header
  (no dependency: `i18next-browser-languagedetector` needs `document`/
  `navigator`, unavailable in Edge/proxy runtime — considered and
  rejected for this reason). The parsing logic is extracted to
  `i18n/resolveLocale.ts` so it's unit-testable without a `NextRequest`.
- **A minimal language switcher** (`features/i18n/LocaleSwitcher.tsx`,
  client component using `usePathname()`) swaps the locale segment while
  preserving the rest of the path. Full placement/styling is task 8's job
  (UI design); this is the minimum needed to verify both languages by
  running the app.
- **`not-found.tsx` receives no props** (Next.js convention) — `proxy.ts`
  sets an `x-pathname` request header on every locale-prefixed request so
  it can recover the locale via `headers()`.
- **`formatPrice` is locale-aware** (`Intl.NumberFormat(locale, ...)`):
  `€12.50` in English, `12,50 €` in Finnish — correct number formatting is
  part of localization, not just string translation.
- **Plural forms use i18next's `_one`/`_other` suffixes**
  (`catalog.pagination.summary`), including Finnish's partitive plural
  ("1 olut" vs. "5 olutta") — a real grammatical distinction, not just an
  English "beer"/"beers" swap.

## Consequences

- Every route file gained a `locale` param; a shared `toLocale(raw: string)`
  helper (`i18n/settings.ts`) narrows Next's generated `params.locale:
  string` to the `Locale` union at each page/layout boundary — Next's
  route-type generation can't see our union from the folder name.
- Async Server Components with async children **cannot be rendered by
  `@testing-library/react`** outside Next's own RSC runtime — confirmed by
  running a probe (`render()` on a tree containing an unresolved async
  child suspends indefinitely under jsdom). Page-level tests
  (`BeersPage`, `BeerPage`) therefore test their own logic (param parsing,
  `generateMetadata`) rather than rendering the full composed tree; each
  leaf component (`BeerList`, `SearchFilters`, `BeerDetailsCard`) has its
  own test rendering it directly (no unresolved descendants); full
  composition is verified by Playwright E2E, now covering both locales
  plus the Accept-Language redirect.
- Interpolated links in translated text (the catalog empty state) use two
  separate translation keys composed in JSX rather than react-i18next's
  `<Trans>` component, since no client i18next context exists yet. Revisit
  if this becomes awkward for a future language with different word order.
