# ADR-0022: Shape-matched loading skeletons, one error boundary at the locale root

- **Status:** accepted
- **Date:** 2026-07-27

## Context

Every route blocked fully on its data fetch with no fallback UI, and an
unexpected fetch failure crashed uncaught — no `error.tsx` existed anywhere in
the app. `BeerList` had a hand-rolled "no beers match" branch that no other
feature could reuse.

The pattern had to be settled while the catalog was still the only feature, so
a later one (`cellar`) inherits it rather than inventing a second shape.

Two framework facts constrain the answer, both specific to this Next.js
version. `error.tsx` must be a Client Component, and the app has no
`app/layout.tsx` distinct from `app/[locale]/layout.tsx` — the locale layout
*is* the effective root, which changes how many error boundaries are needed.

This ADR is written after the fact, per
[ADR-0020](0020-documentation-roles.md). The reasoning previously lived in a
design spec under `docs/superpowers/`, which is gitignored and untracked, and
in a seventeen-line `frontend/README.md` bullet — so for a repository reader
this record did not exist at all.

## Decision

**Loading states are per-route skeletons shaped like the page they replace,
and a single `app/[locale]/error.tsx` is the app-wide error boundary.**

- **One error boundary, not one per route.** Because `app/[locale]/layout.tsx`
  is the effective root, `app/[locale]/error.tsx` is already an ancestor of
  the home page, the catalog list and the detail page. A second,
  catalog-scoped boundary would add a file and catch nothing extra.
- **Skeletons are shape-matched, not generic.**
  `features/catalog/BeerListSkeleton.tsx` mirrors the real grid (heading bar,
  filter bar, ~6 card blocks); `BeerDetailsSkeleton.tsx` mirrors the detail
  layout (back link, heading, subtitle, stat panel, two description lines).
  One spinner for both was rejected — the skeleton's job is to hold the
  page's shape so content does not jump when it arrives.
- **Two generic primitives join `components/ui/`:** `Skeleton` (a single
  pulsing box, no variants — callers size it via `className`) and
  `EmptyState` (required `title` plus a `children` slot, in the dashed-card
  chrome `BeerList` already used). `EmptyState` is an extraction of existing
  markup, not new visual design.
- **Route files stay thin** and delegate to feature compositions, matching the
  existing convention: `beers/loading.tsx` renders `<BeerListSkeleton />`, and
  so on.
- **Recovery uses `unstable_retry()`, not `reset()`.** This Next.js version
  changed the error-boundary recovery API; the current one is used per
  `frontend/AGENTS.md`'s standing warning to read the bundled docs rather than
  rely on training data.
- **Screen readers get one message, not a wall of boxes.** Each skeleton wraps
  its blocks in `<div role="status" aria-label={t("catalog.loading")}>` with
  the individual `Skeleton` elements `aria-hidden="true"`.
- **`error.tsx` forced the client i18next wiring.** It receives no route
  params, so it cannot use the server-side `getTranslation(locale)` pattern.
  `app/[locale]/layout.tsx` already resolves `locale` via `toLocale`, so it
  passes that down to `Providers`, which creates a client i18next instance and
  wraps children in `I18nextProvider`. `error.tsx` then calls
  `useTranslation()` and gets the right locale from context. This is a
  different mechanism from the `x-pathname` header that `loading.tsx` and
  `not-found.tsx` use — those are Server Components and recover the locale
  through `i18n/resolveLocale.ts` instead.
- **Client-side error logging stays a bare `console.error`** in a
  `useEffect`, exactly as the framework's own docs show. No shared logging
  wrapper — see Alternatives considered.

## Alternatives considered

**A shared client-side error-logging utility** ("logging middleware")
wrapping `console.error`. Rejected as an abstraction with one caller: this
`error.tsx` is the only place in the frontend that logs a client-side error,
there are no scattered `console.error` calls to unify, and there are no
requirements yet on format, destination or level — no Sentry, no structured
logging. Contrast `Button`/`Badge`/`Card` in
[ADR-0021](0021-design-tokens-ui-primitives.md), which earned extraction
because three or more call sites already repeated the same markup. Building
this one now means guessing its shape before a second consumer exists to
inform it. Revisit as the first step of the Observability backlog item in
`docs/architecture.md`.

**A second, catalog-scoped `error.tsx`.** The conventional App Router layout
puts a boundary near the routes it protects. Rejected because this app has no
separate root layout, so the locale-level boundary already covers every route;
a second file would be redundant rather than more granular.

**One generic loading spinner for both routes.** Cheaper and less code.
Rejected because it defeats the purpose — a spinner does not reserve the
page's shape, so content shifts on arrival, and the two routes have visibly
different layouts.

**Playwright E2E coverage of the loading and error states.** Rejected as
disproportionate for this task: simulating a genuine backend failure in a
browser test is heavier than the value it adds, and `not-found.tsx` — a
comparable unhappy-path page — already ships with unit-level coverage only.

**Standing up a real `I18nextProvider` with loaded resources in
`error.test.tsx`.** Rejected in favour of mocking `useTranslation` directly,
as the simplest way to unit-test a component that only calls `t()`. Noted as
a precedent set by default rather than by comparison — there was no
established alternative pattern in the codebase to follow.

## Consequences

- Good, because a later feature has a pattern to copy rather than a decision
  to re-make: a `loading.tsx` per route delegating to a shape-matched
  skeleton, and `EmptyState` for the no-results case.
- Good, because an uncaught render error now shows a translated, styled page
  with a working retry instead of crashing, and it does so on every route
  from one file.
- Good, because the skeletons announce a single "Loading beers…" to screen
  readers rather than exposing decorative placeholder boxes.
- Bad, because neither the loading nor the error state has E2E coverage, so a
  regression that only appears against a real failing backend would not be
  caught by any suite. This was an explicit scope decision, not an oversight.
- Bad, because `error.test.tsx` mocks `react-i18next` wholesale, which tests
  the component against a stub rather than the real translation wiring — and
  as the first client component to consume it, that choice becomes the
  reference for the next one.
- Neutral, because client-side errors reach `console.error` and nowhere else.
  That is correct while no monitoring exists, and is the first thing the
  Observability backlog item will need to change.
- **Revisit trigger:** the second client-side error path, or any real
  monitoring destination — either reopens the shared-logging question that
  YAGNI settles here.

## Evidence

**`unstable_retry()` replaced `reset()`** in this Next.js version's
error-boundary contract; the prop signature is
`{ error: Error & { digest?: string }, unstable_retry: () => void }`. Taken
from the bundled docs rather than assumed, per `frontend/AGENTS.md`.

**`error.tsx` is directly renderable by React Testing Library**, unlike most
of this app's components: it is a plain Client Component, not an async Server
Component with async children, so the RTL rendering limitation recorded in
`frontend/README.md` does not apply to it.

**The locale wiring avoided a known defect.** Deriving the locale from the
pathname would have repeated the unvalidated type assertion in
`LocaleSwitcher.tsx` that the Quality backlog flags as COULD-6. Routing it
through `Providers` uses the checked `toLocale` path instead. Locale changes
happen by full navigation to a different locale-prefixed URL, which remounts
the layout tree, so re-initializing `Providers` per `locale` prop change is
correct rather than stale.
