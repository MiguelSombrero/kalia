# Kalia web app

Next.js App Router app that serves the UI and is the BFF: the browser talks only
to Next.js, which calls the Spring Boot API ([architecture.md §5](../docs/architecture.md)).

## Run locally

```bash
npm ci             # from the repository root: one install for every workspace
cd web
npm run dev        # http://localhost:3000 (hot reload) — redirects to /en or /fi
```

`node_modules/` and the lockfile are at the root ([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md));
run scripts from `web/` or from the root with `--workspace web`. The full stack
in containers: `docker compose up --build` from the root.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Required in production, enforced at startup ([ADR-0018](../docs/adr/0018-frontend-env-var-validation.md)) |
| `AUTH_URL` | — | The app's own browser-facing URL. Required ([ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)) |
| `AUTH_SECRET` | — | Session-signing secret. Required; production refuses the dev one |
| `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET` | — | Keycloak client credentials. Required |
| `AUTH_KEYCLOAK_ISSUER` | — | Keycloak's public realm URL, equal to its `KC_HOSTNAME`. Required |
| `AUTH_KEYCLOAK_INTERNAL_ORIGIN` | — | Where this container reaches Keycloak (`lib/auth/internalKeycloakFetch.ts`). Required |
| `VALKEY_URL` | `redis://localhost:6379` | Session store; carries the password `redis://:<password>@host:6379` (dev: `docker-compose.dev.env`) |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |
| `METRICS_TOKEN` | — | Bearer token for `/api/metrics`; unset answers 404. Optional |

Compose sets all of them. One needed in production goes in `REQUIRED_IN_PRODUCTION`
(`lib/config/requiredConfiguration.ts`).

## Observability

Built in, with no viewer ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

- **Logs**: `docker compose logs web --no-log-prefix | jq -c .`; each backend
  call carries a `traceId`: grep it in `docker compose logs --no-log-prefix`
  for the backend's lines of the same request.
- **Counters**: `curl -H "Authorization: Bearer $METRICS_TOKEN" localhost:3000/api/metrics`:
  `kalia_token_refresh_failures_total`, `kalia_backend_call_failures_total`,
  `kalia_request_errors_total`. Add one in `lib/metrics/metrics.ts`; label
  values must be a closed set, never an id or a URL.

## Test and checks

```bash
npm test           # Vitest + React Testing Library (single run)
npm run test:watch # watch mode
npm run lint       # ESLint
npm run build      # production build (includes type checking)
npm run test:e2e   # Playwright — starts the docker compose stack if not running
```

- Node's version is `.node-version` at the root; a bump also edits
  `web/Dockerfile` and the compose files ([ADR-0085](../docs/adr/0085-runtimes-follow-long-term-support-not-the-newest-major.md)).
- Before pushing run `make verify` from the root, or `make verify-fast` (no
  Docker; includes `npm run lint`) ([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
- The API client is the `@kalia/api` package: [packages/README.md](../packages/README.md).
- **A CVE finding** ([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)):
  `npm update <pkg> --package-lock-only` from the root, and `git diff --stat`
  must touch only that entry. Never `npm install <pkg>@<v>`: it promotes a
  transitive dependency to a direct one. If the diff is noisy, hand-edit the
  entry's `version`/`resolved`/`integrity`. Confirm with `make trivy-scan`.

**E2E**

- **A fresh worktree needs its own root `.env`** (gitignored; see the root
  [README](../README.md)) and `make stack-env` for its own host ports. Without
  it `docker compose` fails naming `KALIA_WEB_CLIENT_SECRET`, which reads like a
  broken suite.
- Playwright may leave the stack up: `docker compose down` when done.
- Every request passes the `edge` proxy under ADR-0090's limits; hitting one
  shows as nginx's `429` page, and Server Actions have the tighter zone.
  `edge-limits` is its own project that waits for all others:
  `--project=edge-limits` runs everything first, `--no-deps` skips that.
- A spec that signs in takes the worker-scoped `account` fixture, or
  `adminAccount` for an admin, from `e2e/support/keycloakAccount.ts` — never a
  hardcoded username and never the seeded `testadmin` (ADR-0101).
- A spec that registers names its account with `uniqueUsername`.
- Nothing needs resetting between runs: Keycloak's realm persists.
- **A spec that registers must import `test` from the support file, not
  `@playwright/test`.** `/sign-up` has one shared rate limit that a few runs
  exhaust; the support file's fixtures clear it per test (else call
  `clearSignUpRateLimit` from `e2e/support/valkey.ts`). Otherwise the spec times
  out on Keycloak's `#username` and says nothing about rate limiting
  ([ADR-0055](../docs/adr/0055-self-registration-via-keycloak.md)).

## Conventions

Each rule links the ADR holding its reasoning ([ADR-0020](../docs/adr/0020-documentation-roles.md)).

**Structure**

- **Feature packages**: `features/<feature>/` owns its components, hooks and API
  access; `app/` stays thin. Code moves to `components/` or `lib/` once a second
  feature uses it. `app/` may import `features/`, `components/ui/` and `lib/`;
  `components/ui/` imports `lib/` only (`i18n/` and root `auth.ts` count as
  `lib`); a feature never imports another, so `app/` composes them (a host takes
  a slot such as `BeerList`'s `renderActions`). Consumers import only a feature's
  `index.ts`; an unclaimed folder is rejected. Enforced by
  `eslint-plugin-boundaries` ([ADR-0012](../docs/adr/0012-orval-api-client.md));
  a new policy gets a breaking fixture in `eslint-fixtures/boundaries/`.
- Server components by default; `'use client'` only where interactivity needs it.
- **Arrow functions only**, including page, layout and route exports (ESLint).
- **No hand-written classes; `type` over `interface`.** Factory functions
  (`createX(dependency)`) replace constructors (ESLint,
  [ADR-0037](../docs/adr/0037-functional-modules.md)).
- **Log through `lib/logger.ts`, never `console.*`** (ESLint); no token,
  password, body or query string in a field ([ADR-0013](../docs/adr/0013-logging-conventions.md)).
- **No `dangerouslySetInnerHTML`** (`react/no-danger`); the CSP's
  `'unsafe-inline'` depends on it ([ADR-0016](../docs/adr/0016-security-response-headers.md)).

**Data and state**

- **Client data goes through TanStack Query** via a feature-owned hook
  (`useAddBottle`) that owns the query key, never a bare `useQuery`, never
  hand-rolled `fetch` ([ADR-0008](../docs/adr/0008-tanstack-query.md),
  [ADR-0041](../docs/adr/0041-tanstack-query-feature-owned-hooks.md)).
- **UI state goes in feature-scoped Zustand stores**, never API data or state
  that must survive a reload ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **Stateful forms use react-hook-form + Zod**; one that only navigates is a
  native GET form ([ADR-0010](../docs/adr/0010-react-hook-form-zod.md)).
- **The generated client** (`@kalia/api/generated/*`) is reachable only from a
  feature's `api.ts` and `types.ts`, and only its `models/` and its own tag
  (ESLint). Never edit it: `make api-drift` regenerates it, discarding edits.
- **API failures are a tagged `ApiError`**: branch on `e.kind`, never a message.
  A non-2xx status is not raised ([ADR-0023](../docs/adr/0023-typed-api-failures.md)).

**Auth**

- **Sessions are Auth.js's `"database"` strategy on a hand-written Valkey
  adapter** (`lib/auth/valkeyAdapter.ts`); add no second mechanism and do not
  switch to `"jwt"` ([ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)).
- **Sign in through `auth.ts`'s `signIn`**, via `signInReturningTo` (trap below).
- **Sign out through `federatedSignOut`** (`features/auth/actions.ts`), never
  `signOut()`: it also ends Keycloak's SSO session, this browser's only.
- **Tokens are stored per session**, keyed by the session token, never per user
  ([ADR-0030](../docs/adr/0030-per-session-token-storage.md)); server code reads
  them via `currentSessionToken()` (`auth()` does not expose it). Per-user data keys on the access token's
  `sub`, never an Auth.js user or session id (ADR-0028).
- **`kaliaFetch` attaches the bearer token; callers never do**
  (`instrumentation.ts` registers it at startup; a generated call before throws)
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md),
  [ADR-0029](../docs/adr/0029-silent-token-refresh.md)).
- **Admin is decided on the server** from the session's access token
  (`currentUserIsAdmin`, `lib/auth/adminRole.ts`); only a boolean reaches the
  browser ([ADR-0101](../docs/adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
- **`POST /api/auth/backchannel-logout` is unauthenticated on purpose**; the
  Logout Token's signature stands in for a session ([ADR-0031](../docs/adr/0031-backchannel-logout.md)).

**UI**

- **i18next, every route under `app/[locale]/…`**; strings in
  `packages/locales/src/{en,fi}/common.json`. Keycloak's own pages are
  translated by Keycloak ([ADR-0011](../docs/adr/0011-i18next-localization.md),
  [ADR-0056](../docs/adr/0056-branded-bilingual-keycloak-pages.md)). Build
  locale-prefixed paths with `lib/routes.ts`.
- **The public cellar (`/cellars/{username}`) is the one page without a locale**;
  it and the front page are `noindex, nofollow`, and `metadataBase` comes from
  `AUTH_URL` ([ADR-0050](../docs/adr/0050-public-cellar-addressing.md)).
- **Three route handlers and no more**: `app/api/auth/[...nextauth]`,
  `…/backchannel-logout`, `app/api/metrics`. The feed polls through a Server
  Action ([ADR-0060](../docs/adr/0060-feed-delivery-is-polling.md)).
- **Design tokens are two-layer**: use the semantic layer (`--color-primary`),
  never a primitive, a hex/`rgb()`/`hsl()` colour, a default-palette class or
  `font-[…]`. `scripts/check-token-styling.mjs` fails `make verify-fast`;
  `token-exception: <why>` excuses a literal ([ADR-0066](../docs/adr/0066-token-only-styling-is-a-build-check.md),
  [docs/design.md](../docs/design.md)).
- **A page renders through `<Page width="text" | "wide" | "narrow">`** in its
  `page`, `loading`, `error` and `not-found` files, with no container of its
  own ([ADR-0067](../docs/adr/0067-page-shell-sticky-bar-and-page-component.md)).
- **A title is `PageTitle`, a section heading `SectionHeading`** (`components/ui/`),
  never a hand-written `<h1>`/`<h2>` in `app/` or `features/` (ESLint;
  [ADR-0073](../docs/adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- **`components/ui/` is hand-written and dependency-free** except Radix-wrapped
  `dialog.tsx` and `toast.tsx` (trap below); icons are drawn in `icon.tsx`
  ([ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md)).
- **Loading, error and empty states have a fixed shape**: `loading.tsx` per route
  with a matching skeleton, one `app/[locale]/error.tsx`, `EmptyState`,
  `SignInPrompt` ([ADR-0022](../docs/adr/0022-loading-error-empty-states.md)).

**Testing**

- Tests sit beside the component. **Every full `render(...)` runs `expect(await axe(container)).toHaveNoViolations()`**
  (`jest-axe`). WCAG 2.2 AA is the bar ([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)).
  2.2's layout checks run only at E2E (jsdom has no layout): specs call
  `expectNoA11yViolations` (`e2e/support/a11y.ts`) and `tabTo`
  (`e2e/support/keyboard.ts`). **A sticky or fixed element needs a keyboard flow
  in `e2e/keyboard-flows.spec.ts`**, or nothing checks it hides no focused
  control.

## Traps — do not "fix" these

Each fails silently or only in production, so the warning stays here
([ADR-0017](../docs/adr/0017-code-comment-policy.md)).

- **Native `npm run dev` against the dockerized Keycloak needs an `.env.local`**
  setting `AUTH_KEYCLOAK_INTERNAL_ORIGIN` to the issuer's own origin
  (`http://localhost:8081`), not the Docker-internal address.
- **Export `signIn` from `auth.ts`, never Auth.js's own.** With a live session
  Auth.js links the Keycloak account to the signed-in user, so a second person
  on the browser inherits the first one's identity and tokens. Nothing fails.
- **Keep `handlers` in `app/api/auth/[...nextauth]/route.ts` wrapped in
  `withSignInContext`**: unwrapped, sign-in succeeds but the session later
  reaches no protected endpoint.
- **End the previous session in `callbacks.signIn` (`endPreviousSession`),
  never the route handler.** The callback runs only after state, PKCE and nonce
  pass, so a cross-site link to `/api/auth/callback/keycloak` signs nobody out;
  `lib/auth/signInCallback.test.ts` pins the order.
- **A caller never sets `Authorization`** (`kaliaFetch` throws kind `refused`).
  With no usable token it sends none: a bad one makes even a public route 401.
- **Admin comes from the session token, never a cookie, header or query
  parameter.** The token is decoded unverified; the backend's check backs every
  admin call. `/[locale]/admin` has no `loading.tsx`: it would stream `200`
  ahead of the `404` `notFound()` sends non-admins.
- **Back-channel logout uses the token's `sid`, never `sub`** (every device).
- **Radix-wrapped `dialog.tsx` and `toast.tsx` supply focus trap and restore,
  `Escape`, `aria-live` and auto-dismiss**, which fail silently when hand-rolled.
  No other primitive takes a UI dependency without amending ADR-0021.
- **A new extensionless generated route (like an icon) must be excluded by name
  in `proxy.ts`**, or the locale redirect swallows it.
- **Async Server Components with async children hang under React Testing
  Library.** Test each directly (`render(await Component(props))`).
- **Query-only navigation uses plain anchors, not `next/link`**: it did not
  commit on the catalog route, in production builds only.
- **`kaliaFetch` never passes its own `AbortSignal`**: a signal drops the request
  from Next's per-render memoization, and the detail route fetches one beer
  twice. The 10 s timeout is a raced timer; a caller's signal passes through.
- **A new external origin goes in `buildCspHeader` (`lib/config/cspHeader.ts`)
  in the same PR**, or the browser silently blocks it. Check the console
  ([ADR-0016](../docs/adr/0016-security-response-headers.md)).
- **Never navigate to another origin with a real `<form>`**: `form-action 'self'`
  blocks it even via our own route's redirect; use a Server Action and
  `redirect()`. `curl` ignores CSP. Before hydration such a form posts natively
  and sign-out ends only the local session: keep `AuthSubmitButton` disabled.
- **`headers()` in `next.config.ts` is frozen at build time**: no runtime env
  var can drive the CSP (ADR-0025).
- **The unread count is refetched on navigation by the tray itself**, not the
  layout, which does not re-render between pages; never on mount.
- **A client `queryFn` must not call a feature's `api.ts` for an authenticated
  read**: it drags `ioredis` into the bundle (`Can't resolve 'tls'`). Use a
  `"use server"` action ([ADR-0040](../docs/adr/0040-client-reads-via-server-actions.md)).
- **A Server Action is defined in the `"use server"` file that exports it, never
  re-exported from another**: `UnrecognizedActionError`, caught only by a click.
- **`jose`'s `SignJWT`/`sign()` throws under the default `jsdom` Vitest
  environment** (`payload must be an instance of Uint8Array`: another realm's
  `Uint8Array`). Put `// @vitest-environment node` atop a test that signs a token.
