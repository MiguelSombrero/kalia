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

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Required in production — enforced at server startup (`instrumentation.ts`), see [ADR-0018](../docs/adr/0018-frontend-env-var-validation.md). The default is for `npm run dev`; `docker-compose.yml` always sets it explicitly |

Adding a variable that must be set in production means adding it to
`verifyRequiredConfiguration`'s `REQUIRED_IN_PRODUCTION`
(`lib/config/requiredConfiguration.ts`).

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

CI also scans `package-lock.json` and the built image for known CVEs and
fails on a `HIGH`/`CRITICAL` finding with a fix available
([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)).

Playwright reuses an already-running stack when found, otherwise it starts
one and does not reliably stop it afterwards — run `docker compose down`
from the repo root when you're done testing locally. Not an issue in CI:
the runner is discarded after the job.

## Conventions

Rules for writing code here; each links to the ADR holding the reasoning.
Why the rationale lives there and not here:
[ADR-0020](../docs/adr/0020-documentation-roles.md).

**Structure**

- **Feature-based packages**: `features/<feature>/` owns its components, hooks
  and API access; `app/` route files stay thin and delegate. Shared code moves
  to `components/` or `lib/` only once a second feature uses it.
- Server components by default; `'use client'` only where interactivity needs it.
- **Arrow functions, never function declarations or expressions** — including
  page/layout/route exports. Enforced by ESLint (`eslint.config.mjs`).
- **Logging goes through `lib/logger.ts`, never `console.*` directly** —
  enforced by ESLint's `no-console` rule, which exempts only `lib/logger.ts`
  itself. A thin pass-through today (`logger.error(...)` →
  `console.error(...)`); the seam for routing to a real monitoring tool later
  without touching call sites.

**Data and state**

- **Client-component data goes through TanStack Query** — `useQuery`/`useMutation`,
  never hand-rolled `fetch` + `useState` ([ADR-0008](../docs/adr/0008-tanstack-query.md)).
- **Client UI state goes in feature-scoped Zustand stores**, never API data or
  state that should survive a reload ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **Stateful forms use react-hook-form + Zod.** Submitting navigates → native
  GET form; submitting mutates or validates → this stack
  ([ADR-0010](../docs/adr/0010-react-hook-form-zod.md)).
- **The generated API client** (`lib/api/generated/`) is never imported outside
  `features/<feature>/`; each feature's `api.ts` wraps it
  ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **API failures are a tagged `ApiError`** — branch on `e.kind`, never a
  message. A non-2xx status is *not* raised: a 404 from `getBeer` means "no
  such beer" ([ADR-0023](../docs/adr/0023-typed-api-failures.md)).

**UI**

- **Localization is i18next**, every route under `app/[locale]/…`; strings in
  `i18n/locales/{en,fi}/common.json` ([ADR-0011](../docs/adr/0011-i18next-localization.md)).
- **Design tokens are two-layer**: components reference the semantic layer
  (`--color-primary`), never raw primitives (`--mint-600`). Shared primitives
  live in `components/ui/` ([ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md)).
- **Loading/error/empty states have a fixed shape**: `loading.tsx` per route
  with a shape-matched skeleton, one `app/[locale]/error.tsx` app-wide,
  `EmptyState` for no-results ([ADR-0022](../docs/adr/0022-loading-error-empty-states.md)).

**Testing**

- Component tests live next to the component (`page.test.tsx` beside `page.tsx`).
- Every full `render(...)` adds `import { axe } from "jest-axe";` then
  `expect(await axe(container)).toHaveNoViolations();` (matcher registered
  once in `vitest.setup.ts`). WCAG 2.1 AA is the bar, enforced at three
  layers: `eslint-plugin-jsx-a11y` at lint time, `jest-axe` here, and
  `@axe-core/playwright` scanning real pages tagged
  `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` at E2E time. All three ride the
  existing lint/test/e2e commands — there is no separate a11y gate to forget.

**Traps — do not "fix" these**

Each fails *silently*, or only in production builds, so the warning stays here
rather than behind a link ([ADR-0017](../docs/adr/0017-code-comment-policy.md)).

- **Async Server Components with async children cannot be rendered by React
  Testing Library** — `render()` suspends indefinitely under jsdom rather than
  failing. Test each async component directly (`render(await Component(props))`,
  no unresolved async descendants); test pages that compose them on their own
  logic only (`generateMetadata`, param parsing). Composition is Playwright's job.
- **Query-only navigation uses plain anchors, not `next/link`.** Navigation
  changing only the query string did not commit on the catalog route —
  Previous/Next left the URL and list untouched, **in production builds only**,
  since automatic prefetching does not run in `next dev`. `prefetch={false}`
  was measured as an unreliable remedy. Changing the *pathname* is unaffected
  and should keep `next/link`.
- **`kaliaFetch` never passes an `AbortSignal` of its own.** Next.js drops a
  request from per-render memoization as soon as a signal is present
  (`next/dist/docs/01-app/03-api-reference/04-functions/fetch.md`), and the
  detail route fetches the same beer twice per render — `generateMetadata` and
  the page. The 10 s timeout is therefore a raced timer: it bounds the wait but
  abandons rather than cancels. A caller's own signal passes through untouched,
  so TanStack Query cancellation still works.
- **Adding an external origin** (script, font, image host) means adding it to
  `cspHeader` in `next.config.ts` in the same PR, or the browser silently
  blocks it. Verify in the browser console, not just a successful build
  ([ADR-0016](../docs/adr/0016-security-response-headers.md)).

**Other**

- Code comments carry only what the repo cannot — full policy in
  [CLAUDE.md](../CLAUDE.md) ([ADR-0017](../docs/adr/0017-code-comment-policy.md)).
- This Next.js version may differ from an agent's training data; check
  `node_modules/next/dist/docs/` before relying on memory — see
  [AGENTS.md](AGENTS.md), which already caught `middleware.ts` → `proxy.ts`.
