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
