# Kalia web app

Next.js App Router app that serves the UI and is the BFF: the browser talks only
to Next.js, which calls the Spring Boot API ([architecture.md §5](../docs/architecture.md)).

Code conventions are in [CONVENTIONS.md](CONVENTIONS.md), which loads with this README into every web session.

## Run locally

```bash
npm ci             # from the repository root: one install for every workspace
cd web
npm run dev        # http://localhost:3000 (hot reload) — redirects to /en or /fi
```

`node_modules/` and the lockfile are at the root ([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md));
run scripts from `web/` or from the root with `--workspace web`. The stack:
[root README](../README.md#run-locally).

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
