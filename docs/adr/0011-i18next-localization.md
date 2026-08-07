# ADR-0011: i18next localization (English + Finnish)

- **Status:** accepted
- **Date:** 2026-07-21
- **Amended:** 2026-07-24 — the client bridge this ADR deferred was built the
  same iteration, once the shared error boundary
  ([ADR-0022](0022-loading-error-empty-states.md)) became the first client
  component holding translated text and triggered the condition named below.
  `react-i18next` is wired: `app/providers.tsx` mounts an `I18nextProvider`
  over an instance built with `initReactI18next`

## Context

The frontend-standards iteration sets the localization approach before more
UI ships. Kalia serves both English and Finnish speakers; without a standard
each new page would invent its own approach.

Finnish is not a cosmetic addition to an English app: it has grammatical
number distinctions English lacks, and different number and currency
formatting. Whatever is chosen has to handle both, not just swap strings.

## Decision

**Localization is i18next with locale-prefixed URLs, `en` as the default
locale, and Finnish treated as a full peer of English — including plural
grammar and number formatting, not only string translation.**

- **Locale-prefixed URLs**: every route lives under `app/[locale]/...`
  (`/en/beers`, `/fi/beers/{id}`). Shareable/bookmarkable per-language links,
  correct `<html lang>`, and the pattern nearly all Next.js App Router +
  i18next guides use. `[locale]/layout.tsx` is the de facto root layout
  (`<html>`/`<body>` live there — there is nothing outside `[locale]/` in
  the route tree).
- **`i18next` 26.3.6 + `i18next-resources-to-backend` 1.2.1** for server
  components (`i18n/server.ts`), with a fresh `createInstance()` per call
  rather than shared module-level state, so it is safe under concurrent
  requests. Every current UI string is migrated; the translation resources
  live at `i18n/locales/{en,fi}/common.json`, one `common` namespace for now.
- **`react-i18next` 17.0.10 is installed but not yet wired** — no client
  component holds translated text today (the switcher only needs locale
  codes "EN"/"FI", which aren't translated). Follows the install-now,
  wire-later precedent from [ADR-0009](0009-zustand-ui-state.md) and
  [ADR-0010](0010-react-hook-form-zod.md); the client bridge
  (`I18nextProvider`, resource hydration from the server-resolved
  instance) is added when the first client component needs it.
  (Since amended: that component arrived and the bridge is built. It
  imports the locale JSON statically rather than hydrating from the
  server-resolved instance, so `init()` completes synchronously and no
  untranslated keys flash while resources stream in.)
- **`en` is the default locale**, and locale-less requests are redirected to
  `/{locale}` by hand-parsing the `Accept-Language` header rather than taking
  a dependency for it. The parsing logic is extracted to
  `i18n/resolveLocale.ts` so it is unit-testable without a `NextRequest`.
- **A minimal language switcher** (`features/i18n/LocaleSwitcher.tsx`, a
  client component using `usePathname()`) swaps the locale segment while
  preserving the rest of the path. Full placement and styling belong to the
  UI-design task in [iteration 2](../tasks/iteration-2.md); this is the
  minimum needed to verify both languages by running the app.
- **Number and currency formatting is locale-aware** (`formatPrice`, via
  `Intl.NumberFormat(locale, …)`): `€12.50` in English, `12,50 €` in
  Finnish — correct number formatting is part of localization, not just
  string translation.
- **Plural forms use i18next's `_one`/`_other` suffixes**
  (`catalog.pagination.summary`), including
  Finnish's partitive plural ("1 olut" vs. "5 olutta") — a real grammatical
  distinction, not just an English "beer"/"beers" swap. This is the
  requirement that rules out any approach treating translation as string
  substitution.

## Alternatives considered

**`i18next-browser-languagedetector` for default-locale resolution.**
The library's own answer to the problem, and the reason `Accept-Language` is
hand-parsed instead. Rejected because it needs `document`/`navigator`, which
are unavailable in the Edge/proxy runtime where the redirect has to happen.

**None recorded for the library itself.** i18next was adopted without a
written comparison against `next-intl` or the App Router's own i18n
conventions. This is a gap in the record rather than a decision that had no
alternatives: a future reader should treat the library choice as
conventional-by-default, and the constraints in Context — Finnish plural
grammar, Edge-runtime locale resolution, server-component rendering — as the
criteria any replacement would have to meet.

## Consequences

- Good, because both languages are verifiable by running the app from the
  first day the convention exists, rather than after a later wiring task.
- Good, because Finnish plural forms and number formatting are handled by the
  mechanism itself, so a new string gets them right without the author
  knowing the rule.
- Bad, because every route file gained a `locale` param, and a shared
  `toLocale(raw: string)` helper (`i18n/settings.ts`) is needed to narrow
  Next's generated `params.locale: string` to the `Locale` union at each
  page/layout boundary — Next's route-type generation can't see that union
  from the folder name.
- Bad, because page-level tests cannot render the full composed tree: async
  Server Components with async children cannot be rendered by
  `@testing-library/react` outside Next's own RSC runtime (see Evidence).
  Page-level tests (`BeersPage`, `BeerPage`) therefore cover their own logic
  (param parsing, `generateMetadata`); each leaf component (`BeerList`,
  `SearchFilters`, `BeerDetailsCard`) has its own test rendering it directly,
  and full composition is verified by Playwright E2E, now covering both
  locales plus the Accept-Language redirect.
- Neutral, because interpolated links in translated text (the catalog empty
  state) use two separate translation keys composed in JSX rather than
  react-i18next's `<Trans>` component, since no client i18next context
  exists yet. Revisit if this becomes awkward for a future language with
  different word order.

## Evidence

**Async Server Components cannot be rendered by `@testing-library/react`.**
Confirmed by running a probe: `render()` on a tree containing an unresolved
async child suspends indefinitely under jsdom. This is what forces the test
structure described in Consequences, rather than a preference.

**`not-found.tsx` receives no props** (Next.js convention), so `proxy.ts`
sets an `x-pathname` request header on every locale-prefixed request and the
locale is recovered via `headers()`.

**`proxy.ts` is Next.js 16's renamed `middleware.ts`** — see
`frontend/AGENTS.md`, which records that this version differs from what a
model is likely to assume.
