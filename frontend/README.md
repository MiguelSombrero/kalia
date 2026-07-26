# Kalia frontend

Next.js 16 App Router app (TypeScript, Tailwind CSS). Serves the UI and acts
as the BFF: the browser talks only to Next.js, which calls the Spring Boot
API — see [docs/architecture.md](../docs/architecture.md).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 (hot reload) — redirects to /en or /fi
```

Or the full stack in containers: `docker compose up --build` from the repo
root. The production image uses Next.js standalone output
(`next.config.ts`).

## Test and checks

```bash
npm test           # Vitest + React Testing Library (single run)
npm run test:watch # watch mode
npm run lint       # ESLint
npm run build      # production build (includes type checking)
npm run test:e2e   # Playwright — starts the full docker compose stack if
                    # it isn't already running (needs Docker)
npm run generate:api  # regenerate lib/api/generated/ from a live backend
                       # (docker compose up -d backend postgres first)
```

Regenerated output must be committed — CI's `api-client-drift` job
regenerates and diffs, failing the build on drift (ADR-0012).

Playwright reuses an already-running stack when found, otherwise it starts
one and does not reliably stop it afterwards — run `docker compose down`
from the repo root when you're done testing locally. Not an issue in CI:
the runner is discarded after the job.

## Conventions

- **Feature-based package structure**: code is organized by feature, not by
  technical type — `features/catalog/`, `features/cellar/`, … each holding
  its own components, hooks and API access. Route files under `app/` stay
  thin and delegate to the feature folder; truly shared code goes to
  `components/` or `lib/` only once more than one feature uses it. Mirrors
  the backend's module-per-subdomain structure.
- Server components by default; `'use client'` only where interactivity
  requires it.
- **Arrow functions, not function declarations/expressions** — including
  page/layout/route exports (`const Home = () => { … }; export default
  Home;`). Enforced by ESLint (`no-restricted-syntax` in `eslint.config.mjs`).
- **Client-component data goes through TanStack Query (ADR-0008).** Reads
  use `useQuery`, mutations `useMutation` — never hand-rolled
  `fetch` + `useState`/`useEffect` plumbing. The app-wide `QueryClient`
  lives in `app/providers.tsx` (default `staleTime` 60 s; override per
  query). Server components are unaffected and keep fetching on the server.
  `@tanstack/eslint-plugin-query` enforces correct usage.
- **Stateful forms use react-hook-form + Zod (ADR-0010):** the Zod schema
  (colocated in `features/<feature>/`) is the source of truth, wired via
  `@hookform/resolvers`; no hand-rolled validation in components. Rule of
  thumb: submitting navigates → native GET form (like `SearchFilters`);
  submitting mutates or validates → this stack.
- **Client UI state goes in feature-scoped Zustand stores (ADR-0009):**
  `features/<feature>/store.ts`, subscribed via selectors. Never API data
  (TanStack Query's job), never state that should survive a share/reload
  (the URL's job); plain `useState` stays correct for single-component
  state.
- **API client generated from the backend's OpenAPI spec (ADR-0012):**
  `lib/api/generated/` (orval, committed, regenerated via `npm run
  generate:api`) is never imported directly outside `features/<feature>/`.
  Each feature's `api.ts` wraps the generated client behind its own stable
  function signatures — `types.ts` re-exports the generated model types
  under the feature's existing names.
- **Localization via i18next (ADR-0011):** every route lives under
  `app/[locale]/...`. Server components translate with
  `getTranslation(locale)` from `i18n/server.ts`; translation strings live
  in `i18n/locales/{en,fi}/common.json`. `proxy.ts` redirects locale-less
  requests based on `Accept-Language`. `react-i18next` is installed but not
  wired — no client component needs translations yet; wire it (provider +
  resource hydration) when one does.
- Component tests live next to the component (`page.test.tsx` beside
  `page.tsx`). **Async Server Components with async children cannot be
  rendered by React Testing Library** (confirmed by testing it — `render()`
  suspends indefinitely under jsdom outside Next's RSC runtime): test each
  async component directly and in isolation (`render(await Component(props))`,
  no unresolved async descendants), and test pages that compose async
  children on their own logic only (`generateMetadata`, param parsing) —
  full composition is Playwright's job.
- Note `AGENTS.md`: this Next.js version may differ from an agent's training
  data — check `node_modules/next/dist/docs/` before relying on memory. It
  already caught one real breaking change: `middleware.ts` is renamed to
  `proxy.ts` in Next.js 16.
- **Every component/page ships accessible to WCAG 2.1 AA from here on
  (iteration 2 task 7).** New component tests that do a full `render(...)`
  add an `axe()` assertion: `import { axe } from "jest-axe";` then
  `expect(await axe(container)).toHaveNoViolations();` (matcher registered
  once in `vitest.setup.ts`). `eslint-plugin-jsx-a11y`'s recommended
  ruleset lints ARIA/roles/labels at commit time. Catalog-page E2E specs
  scan real rendered pages with `@axe-core/playwright`, tagged
  `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`. All three ride the existing
  `npm run lint`/`npm test`/`npm run test:e2e` — no separate a11y command
  or CI job.
- **Design tokens & shared UI primitives (iteration 2 task 8):** the color
  palette and typography are centralized as CSS custom properties in
  `app/globals.css`, in two layers — raw primitives (e.g. `--mint-600`)
  and semantic aliases (e.g. `--color-primary`) that components actually
  reference — mapped into Tailwind v4 utilities via the file's `@theme
  inline` block (CSS-first, no `tailwind.config.ts`). Fraunces (display/
  headings) and Inter (body/UI) are loaded via `next/font/google` in
  `app/[locale]/layout.tsx`. Light-mode only — no dark theme. Three small
  shared primitives live in `components/ui/`: `Button`/`buttonVariants`,
  `Badge`, and `Card`/`cardVariants` — the seam for a possible future
  design-system extraction. No new dependency: variant selection is a
  hand-rolled `cn()` helper (`lib/cn.ts`), not `clsx`/`tailwind-merge`/
  `class-variance-authority`.
- **Loading, error and empty states (iteration 2 task 9):** `loading.tsx`
  wraps each catalog route (list and detail), each rendering a shape-
  matched skeleton (`features/catalog/BeerListSkeleton.tsx`,
  `BeerDetailsSkeleton.tsx`) built from the generic `Skeleton` primitive
  in `components/ui/` — sized placeholder blocks only, no variants.
  `loading.tsx`/`not-found.tsx` receive no route params (Next.js
  convention), so both recover the locale from the `x-pathname` header
  `proxy.ts` sets on every request. A single `app/[locale]/error.tsx`
  error boundary — an ancestor of every route since there's no separate
  root `app/layout.tsx` — covers uncaught exceptions app-wide, using Next
  16's `unstable_retry()` API. `error.tsx` is the first Client Component
  needing translations, so `react-i18next` (previously installed but
  unwired) is now wired through `app/providers.tsx`, seeded with the
  current locale's resources synchronously (no dynamic-import flash).
  `EmptyState` (also in `components/ui/`) generalizes the "no results"
  pattern `BeerList` already had — the shape any future feature's empty
  state should reuse rather than reinvent.
- **API failures are typed (iteration 3 task 6):** everything that can go
  wrong with a backend call is raised as an `ApiError`
  (`lib/api/api-error.ts`) tagged `network`, `timeout`, `http` or `parse`,
  so callers branch on `isApiError(e) && e.kind === …` rather than parsing
  a message. It is built by decorating an `Error` rather than subclassing,
  because a class constructor is a function expression and the arrow-function
  convention above bans those; it stays a real `Error`, which the Next.js
  error boundary and stack traces both require. Non-2xx statuses are *not*
  raised by `kaliaFetch` — the caller decides what a status means, and a 404
  from `getBeer` is "no such beer", not a failure.
- **`kaliaFetch` never passes an `AbortSignal` of its own.** Next.js drops a
  request from per-render memoization as soon as a signal is present
  (`next/dist/docs/01-app/03-api-reference/04-functions/fetch.md`), and the
  beer detail route fetches the same beer twice per render — once in
  `generateMetadata`, once in the page. The 10 s timeout is therefore a raced
  timer, which bounds the wait but abandons rather than cancels the request.
  A caller's own signal is passed through untouched, so TanStack Query
  cancellation still works.
