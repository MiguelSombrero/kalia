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
| `AUTH_URL` | — | The app's own browser-facing URL. Required — without it, Auth.js infers it from the container's `0.0.0.0` bind address instead of the real one (see [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)) |
| `AUTH_SECRET` | — | Auth.js session-signing secret. Required |
| `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET` | — | Keycloak client credentials. Required |
| `AUTH_KEYCLOAK_ISSUER` | — | Keycloak's **public**, browser-facing realm URL — must match Keycloak's own `KC_HOSTNAME`. Required — see [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md) for why this can't be the internal Docker Compose address |
| `AUTH_KEYCLOAK_INTERNAL_ORIGIN` | — | Where this container actually reaches Keycloak; requests to `AUTH_KEYCLOAK_ISSUER` are transparently redirected here (`lib/auth/internalKeycloakFetch.ts`). Required |
| `VALKEY_URL` | `redis://localhost:6379` | Session store for the Auth.js adapter (`lib/auth/valkeyAdapter.ts`). Required in production |

The five `AUTH_KEYCLOAK_*`/`AUTH_URL`/`VALKEY_URL` values above are set by
`docker-compose.yml` for the containerized stack. Running `npm run dev`
natively against that same dockerized Keycloak needs its own `.env.local`
— and since a native process has no container network split, set
`AUTH_KEYCLOAK_INTERNAL_ORIGIN` to the **same** value as
`AUTH_KEYCLOAK_ISSUER`'s origin (`http://localhost:8081`), not Keycloak's
internal Docker Compose address.

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
([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)). A finding
is fixed in place on whatever branch is open (CLAUDE.md). Most findings are a
transitive dependency's resolved version — bump only `package-lock.json`, not
`package.json`: `npm update <package> --package-lock-only`, then check
`git diff --stat` touches only that package's entry. A local npm version
that differs from whichever produced the lockfile can otherwise pull in
unrelated normalization noise (dropped `libc` fields, added `dev: true`
flags) alongside the real fix, and `npm install <package>@<version>` instead
of `npm update` will silently promote a transitive dependency to a direct one
in `package.json`. If the diff isn't narrowly the flagged package's `version`/
`resolved`/`integrity` fields, hand-edit those three fields instead of trusting
the tool's output. Confirm the fix locally before pushing:
`trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed package-lock.json`
from `frontend/`, matching CI's `vulnerability-scan.yml` exactly.

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
  to `components/` or `lib/` only once a second feature uses it. `app/` may
  import `features/`, `components/ui/` and `lib/`; a feature never imports
  another feature; `components/ui/` imports `lib/` only (`i18n/` and the root
  `auth.ts` count as `lib`). Enforced by ESLint (`eslint-plugin-boundaries` in
  `eslint.config.mjs`), which also rejects importing a folder no layer claims —
  [ADR-0012](../docs/adr/0012-orval-api-client.md).
- **A feature never reaches into another feature — `app/` composes them.**
  When one feature's page needs another's affordance (the catalog's pages
  carry cellar's add-to-cellar button), the host component takes a slot —
  `BeerList`'s `renderActions` render prop, `BeerDetailsCard`'s `actions`
  node — and the route in `app/` fills it from the other feature's barrel.
  The host stays unaware the other feature exists. Enforced by the same
  `eslint-plugin-boundaries` rule as above, so the alternative fails `npm run
  lint` rather than working quietly.
- **Each feature exposes a trimmed public surface through `features/<feature>/index.ts`** —
  only the symbols a genuine external consumer needs, decided per symbol
  against the current import graph rather than re-exporting every internal
  path. An outside consumer imports only from that root; deep-importing a
  feature's internals (e.g. `features/catalog/BeerList` instead of
  `features/catalog`) is rejected by the same `eslint-plugin-boundaries` rule
  above
  ([task 06](../docs/tasks/iteration-5/06-feature-public-surfaces.md)).
- Server components by default; `'use client'` only where interactivity needs it.
- **Arrow functions, never function declarations or expressions** — including
  page/layout/route exports. Enforced by ESLint (`eslint.config.mjs`).
- **No hand-written classes; `type` over `interface`.** Discriminated unions
  with type-guard predicates replace polymorphism, and factory functions
  (`createX(dependency)`) replace constructors for dependency injection.
  Enforced by ESLint (`no-restricted-syntax`'s `ClassDeclaration` selector,
  `@typescript-eslint/consistent-type-definitions`) —
  [ADR-0037](../docs/adr/0037-functional-modules.md).
- **Logging goes through `lib/logger.ts`, never `console.*` directly** —
  enforced by ESLint's `no-console` rule, which exempts only `lib/logger.ts`
  itself. A thin pass-through today (`logger.error(...)` →
  `console.error(...)`); the seam for routing to a real monitoring tool later
  without touching call sites.

**Data and state**

- **Client-component data goes through TanStack Query** — `useQuery`/`useMutation`,
  never hand-rolled `fetch` + `useState` ([ADR-0008](../docs/adr/0008-tanstack-query.md)).
  A component calls a feature-owned hook wrapping it (`useCellarBottles`),
  never `useQuery`/`useMutation` directly — the hook owns the query key and
  any `invalidateQueries` a sibling mutation needs against it
  ([ADR-0041](../docs/adr/0041-tanstack-query-feature-owned-hooks.md)).
- **Client UI state goes in feature-scoped Zustand stores**, never API data or
  state that should survive a reload ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **Stateful forms use react-hook-form + Zod.** Submitting navigates → native
  GET form; submitting mutates or validates → this stack
  ([ADR-0010](../docs/adr/0010-react-hook-form-zod.md)).
- **The generated API client** (`lib/api/generated/`) is reachable only from a
  feature's own `api.ts` and `types.ts`, which wrap it — enforced by ESLint
  ([ADR-0012](../docs/adr/0012-orval-api-client.md)). It is also never edited
  by hand — regenerate it with `npm run generate:api`. `.claude/settings.json`
  denies agents `Edit` there, since a regeneration discards a hand-edit without
  a word.
- **API failures are a tagged `ApiError`** — branch on `e.kind`, never a
  message. A non-2xx status is *not* raised: a 404 from `getBeer` means "no
  such beer" ([ADR-0023](../docs/adr/0023-typed-api-failures.md)).

**Auth**

- **Sessions are Auth.js's `"database"` strategy, backed by a hand-written
  Valkey adapter** (`lib/auth/valkeyAdapter.ts`) — never add a second
  session mechanism or switch to the `"jwt"` strategy without reading
  [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md) first.
- **Sign-out goes through the `federatedSignOut` Server Action
  (`features/auth/actions.ts`), never Auth.js's own `signOut()` directly** —
  it also ends Keycloak's SSO session, which `signOut()` alone does not do.
  It ends *this* browser's session only; another device stays signed in.
- **Keycloak tokens are stored per session, keyed by the Auth.js session
  token** (`lib/auth/valkeyAdapter.ts`), never per user
  ([ADR-0030](../docs/adr/0030-per-session-token-storage.md)). Server code
  reaches them via `currentSessionToken()` — `auth()` does not expose the
  session token. **Do not export Auth.js's `handlers` directly from
  `app/api/auth/[...nextauth]/route.ts`**: they are wrapped in
  `withSignInContext`, which is what lets the issued tokens be filed under the
  session just created. Unwrapping it fails silently — sign-in still succeeds,
  and only later does the session turn out to reach no protected endpoint.
- **`kaliaFetch` attaches the bearer token; callers never do.** An expired one
  is renewed first, and if it cannot be, no token is sent at all rather than a
  bad one — the backend answers 401 to a bad token even on a public route, so
  sending one breaks anonymous catalog browsing for a signed-in user
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md),
  [ADR-0029](../docs/adr/0029-silent-token-refresh.md)).
- **Per-user data keys on the access token's `sub`**, which the backend reads
  itself ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) —
  never on an Auth.js user or session id, which are this app's own.
- **`POST /api/auth/backchannel-logout` is intentionally unauthenticated** —
  Keycloak calls it server-to-server with no session cookie, and the Logout
  Token's own signature (verified against Keycloak's JWKS,
  `lib/auth/backchannelLogoutToken.ts`) is what stands in for one. It ends
  the session matching the token's `sid` only, never falling back to `sub`:
  that would silently widen a single-session logout into signing the user out
  everywhere, undoing [ADR-0030](../docs/adr/0030-per-session-token-storage.md)'s
  per-device precision for this one caller
  ([ADR-0031](../docs/adr/0031-backchannel-logout.md)).

**UI**

- **Localization is i18next**, every route under `app/[locale]/…`; strings in
  `i18n/locales/{en,fi}/common.json` ([ADR-0011](../docs/adr/0011-i18next-localization.md)).
- **Design tokens are two-layer**: components reference the semantic layer
  (`--color-primary`), never raw primitives (`--mint-600`). Shared primitives
  live in `components/ui/` ([ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md)).
- **`components/ui/` is hand-written and dependency-free, with one exception:
  `dialog.tsx` wraps `@radix-ui/react-dialog` 1.1.23** for the focus trap,
  focus restore, `Escape` handling and `aria-modal` inerting a modal needs —
  behaviour, not styling, and each part of it fails silently
  ([ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md)'s 2026-08-22
  amendment). Radix is headless: the dialog is still styled with the semantic
  tokens above, and no other primitive may take a UI dependency without
  amending that ADR again.
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
- **`jose`'s `SignJWT`/`sign()` throws under this project's default Vitest
  environment** (`jsdom`, set in `vitest.config.ts`): `TypeError: payload
  must be an instance of Uint8Array`, from jose's own check on the payload it
  just encoded — jsdom's `Uint8Array` is a different realm from Node's.
  `jwtVerify`/`decodeJwt` are unaffected; only *producing* a token to test
  against needs it. A test file that signs one overrides the environment
  per-file with a `// @vitest-environment node` docblock above its imports
  (see `lib/auth/backchannelLogoutToken.test.ts`).

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
- **Never navigate to another origin with a real `<form>`** — `form-action
  'self'` blocks it, *including* when the form posts to our own route and
  that route answers with a cross-origin redirect. Use a Server Action and
  `redirect()`, whose navigation the client router performs instead (that is
  why sign-out is `federatedSignOut`, not a route handler —
  [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)). **`curl` does not
  enforce CSP and will happily follow the redirect**, so this only reproduces
  in a browser — check the console, not just the response headers.
- **`headers()` in `next.config.ts` is baked in at build time**, not read per
  request: a `process.env` value there is frozen to whatever was set during
  `next build`, so the CSP cannot be driven by a runtime environment
  variable. Measured, see [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)'s
  Evidence.
- **A client component's `queryFn` must not call a feature's `api.ts`
  directly when the read is authenticated.** `kaliaFetch`'s token lookup
  drags `lib/auth/valkeyAdapter.ts` and `ioredis` into the client bundle,
  which fails `npm run build` several layers down with `Module not found:
  Can't resolve 'tls'` — a message that names `ioredis`, not the client
  component that actually caused it. Route the call through a `"use server"`
  action in the feature's `actions.ts` instead
  ([ADR-0040](../docs/adr/0040-client-reads-via-server-actions.md)).
- **A Server Action must be defined in the `"use server"` file that exports
  it, never re-exported from a different `"use server"` file.** Sharing one
  Server Action (e.g. `startSignIn`) between two features by defining it
  once in a `lib/` module and re-exporting it from each feature's
  `actions.ts` breaks Next's action-ID resolution: the client sends an ID
  the server's manifest doesn't recognize, and the form submission fails at
  runtime with `UnrecognizedActionError` — a real `POST` to the current
  page, 404. No test, lint, or build catches this; only clicking the button
  in a browser does. Duplicate the small action per feature instead
  (matches the feature-isolation rule above, so it costs nothing extra).

**Other**

- Code comments carry only what the repo cannot — full policy in
  [`.claude/rules/code-comments.md`](../.claude/rules/code-comments.md), which
  loads on its own when you open a file here
  ([ADR-0017](../docs/adr/0017-code-comment-policy.md)).
- This Next.js version may differ from an agent's training data; check
  `node_modules/next/dist/docs/` before relying on memory — see
  [AGENTS.md](AGENTS.md), which already caught `middleware.ts` → `proxy.ts`.
