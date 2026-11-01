# Kalia web app

Next.js 16 App Router app (TypeScript, Tailwind CSS). Serves the UI and acts
as the BFF: the browser talks only to Next.js, which calls the Spring Boot
API — see [docs/architecture.md](../docs/architecture.md).

## Run locally

```bash
npm ci             # from the repository root: one install for every workspace
cd web
npm run dev        # http://localhost:3000 (hot reload) — redirects to /en or /fi
```

`web/` is one of the repository's npm workspaces: its dependencies and the
one lockfile are at the root ([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)),
so `node_modules/` is there too, not in `web/`. The scripts below run from
`web/`, or from the root with `--workspace web`.

Or the full stack in containers: `docker compose up --build` from the repo
root. The production image is built with the repository root as its context
(`web/Dockerfile`) and uses Next.js standalone output (`next.config.ts`).

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Required in production — enforced at server startup (`instrumentation.ts`), see [ADR-0018](../docs/adr/0018-frontend-env-var-validation.md). The default is for `npm run dev`; the compose files always set it explicitly |
| `AUTH_URL` | — | The app's own browser-facing URL. Required — without it, Auth.js infers it from the container's `0.0.0.0` bind address instead of the real one (see [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)) |
| `AUTH_SECRET` | — | Auth.js session-signing secret. Required, and in production the dev secret committed in `docker-compose.dev.env` is refused unless `KALIA_DEV_STACK=true`, which only `docker-compose.override.yml` sets ([ADR-0089](../docs/adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)) |
| `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET` | — | Keycloak client credentials. Required |
| `AUTH_KEYCLOAK_ISSUER` | — | Keycloak's **public**, browser-facing realm URL — must match Keycloak's own `KC_HOSTNAME`. Required — see [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md) for why this can't be the internal Docker Compose address |
| `AUTH_KEYCLOAK_INTERNAL_ORIGIN` | — | Where this container actually reaches Keycloak; requests to `AUTH_KEYCLOAK_ISSUER` are transparently redirected here (`lib/auth/internalKeycloakFetch.ts`). Required |
| `VALKEY_URL` | `redis://localhost:6379` | Session store for the Auth.js adapter (`lib/auth/valkeyAdapter.ts`). Required in production, and it carries the password the store requires: `redis://:<password>@host:6379`. Native `npm run dev` against the compose stack's Valkey sets `redis://:kalia-dev-valkey-password@localhost:6379` in `.env.local` |
| `LOG_LEVEL` | `info` | Lowest level `lib/logger.ts` writes on the server: `debug`, `info`, `warn` or `error` |
| `METRICS_TOKEN` | — | Bearer token for `/api/metrics`. Unset, that route answers 404. Optional: it is deliberately not in `REQUIRED_IN_PRODUCTION`. Compose supplies a dev-only value |

The six `AUTH_KEYCLOAK_*`/`AUTH_URL`/`VALKEY_URL` values above are set by
the compose files for the containerized stack. Running `npm run dev`
natively against that same dockerized Keycloak needs its own `.env.local`
— and since a native process has no container network split, set
`AUTH_KEYCLOAK_INTERNAL_ORIGIN` to the **same** value as
`AUTH_KEYCLOAK_ISSUER`'s origin (`http://localhost:8081`), not Keycloak's
internal Docker Compose address.

Adding a variable that must be set in production means adding it to
`verifyRequiredConfiguration`'s `REQUIRED_IN_PRODUCTION`
(`lib/config/requiredConfiguration.ts`).

## Observability

Logs, counters and trace ids are built in; nothing in the stack views them
([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

- **Logs**: `docker compose logs web --no-log-prefix | jq -c .`. Each
  backend call is one line carrying `traceId`; grep that id in `docker compose
  logs --no-log-prefix` to see the backend's lines for the same browser
  request.
- **Trace id.** `proxy.ts` gives every page request a W3C `traceparent` (a
  valid one the caller sent is kept) and `kaliaFetch` forwards it unchanged to
  the backend, whose Micrometer Tracing puts it in its logs. A call made
  outside a request starts a trace of its own.
- **Counters** at `/api/metrics`, for the bearer token in `METRICS_TOKEN`:
  `curl -H "Authorization: Bearer $METRICS_TOKEN" localhost:3000/api/metrics`
  (compose's value is `kalia-dev-metrics-token`). They are
  `kalia_token_refresh_failures_total{outcome,reason}` (a refresh that logs at
  `WARN` as it counts), `kalia_backend_call_failures_total{kind}` and
  `kalia_request_errors_total{route,route_type}` (a request Next.js failed,
  by route template). Add one in `lib/metrics/metrics.ts`; a label's values
  must be a closed set, never an id or a URL.

## Test and checks

```bash
npm test           # Vitest + React Testing Library (single run)
npm run test:watch # watch mode
npm run lint       # ESLint
npm run build      # production build (includes type checking)
npm run test:e2e   # Playwright — starts the full docker compose stack if
                    # it isn't already running (needs Docker)
```

Node's version is the one in `.node-version` at the repository root: CI reads
it, and nvm, fnm and asdf pick it up locally. The Docker tags are the only
other place it is written, so a bump edits that file, `web/Dockerfile` and
the compose files together. Node moves between long-term-support releases,
not to the newest major ([ADR-0085](../docs/adr/0085-runtimes-follow-long-term-support-not-the-newest-major.md)).

Before pushing, run the whole gate rather than any of these alone:
`make verify` from the repository root, or `make verify-fast` for the subset
that needs no Docker — it includes `npm run lint`, so a module-boundary
violation in a new test file fails here rather than in CI
([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

The API client is not here: it is the `@kalia/api` package, generated from
`backend/openapi.json` — see [packages/README.md](../packages/README.md) for
regenerating it and what CI checks.

CI also scans `package-lock.json` and the built image for known CVEs and
fails on a `HIGH`/`CRITICAL` finding with a fix available
([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)). A finding
is fixed in place on whatever branch is open (CLAUDE.md). Most findings are a
transitive dependency's resolved version — bump only `package-lock.json` (at the repository root), not
`package.json`: `npm update <package> --package-lock-only` from the root, then check
`git diff --stat` touches only that package's entry. A local npm version
that differs from whichever produced the lockfile can otherwise pull in
unrelated normalization noise (dropped `libc` fields, added `dev: true`
flags) alongside the real fix, and `npm install <package>@<version>` instead
of `npm update` will silently promote a transitive dependency to a direct one
in `package.json`. If the diff isn't narrowly the flagged package's `version`/
`resolved`/`integrity` fields, hand-edit those three fields instead of trusting
the tool's output. Confirm the fix locally before pushing with `make trivy-scan`
from the repository root, which runs CI's `vulnerability-scan.yml` manifest
scan with its exact flags.

Playwright reuses an already-running stack when found, otherwise it starts
one and does not reliably stop it afterwards — run `docker compose down`
from the repo root when you're done testing locally. Not an issue in CI:
the runner is discarded after the job.

**A fresh worktree needs its own root `.env` before the stack will start.**
It is gitignored, so it does not travel with a `git worktree add`, and
without it `docker compose` fails on an interpolation error naming
`KALIA_WEB_CLIENT_SECRET` rather than anything about tests — which
reads like a broken E2E suite. Create it as the root
[README](../README.md) describes, and `make stack-env` to give the worktree
its own host ports. The suite reads them from that `.env`
(`stackOrigins.ts`) and falls back to the defaults, so two worktrees can run
it at once. The Valkey password comes the same way, from `VALKEY_PASSWORD` or
`docker-compose.dev.env`.

Every request in the suite passes through the `edge` proxy, from one address,
under the limits in
[ADR-0090](../docs/adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md).
`e2e/edge-limits.spec.ts` deliberately exhausts some of them, so it is its own
Playwright project that waits for every other spec: `--project=edge-limits`
therefore runs the whole suite first, and `--no-deps` skips that when the
stack is already warm. If a spec you add makes many requests in a burst, the
symptom of hitting a limit is a `429` page from nginx, not an application
error.

A spec that signs in gets its Keycloak account from the worker-scoped
`account` fixture (`e2e/support/keycloakAccount.ts`), never a hardcoded
username: the account is derived from the Playwright worker index and
provisioned idempotently via the admin API on first use. One account per
worker, not per file or per spec — `fullyParallel` (`playwright.config.ts`)
schedules files onto whichever worker is free, so two specs signing in as
the same fixed account can and did land on different workers at once and
step on each other's session mid-test
([iteration 6 task 11](../docs/tasks/iteration-6/11-e2e-suite-account-contention.md)).
A new spec that needs to sign in imports `test`/`expect` from that support
file and uses the `account` fixture, the same way
`e2e/sign-in-out.spec.ts` does.

**Nothing needs resetting before running the suite.** Keycloak's realm
persists across restarts ([iteration 6.5 task
01](../docs/tasks/iteration-6.5/01-persist-keycloak-state.md)), so a
worker's `account` is created once and reused on every later run — never
recreated, never deleted. A spec that registers a new account (`sign-up.spec.ts`,
`keycloak-email.spec.ts`, `keycloak-branding.spec.ts`) names it with
`uniqueUsername` (`e2e/support/keycloakAccount.ts`) — a timestamp plus a
random suffix, since `--repeat-each` starts copies of one test in the same
millisecond — and never deletes it either: those accounts accumulate as harmless
leftover data rather than being cleaned up, so a registration spec run twice
never collides with its own prior run on an already-registered address. The
only thing that clears any of this is `docker compose down -v`, which is not
part of the normal test loop
([iteration 6.5 task 09](../docs/tasks/iteration-6.5/09-deterministic-test-accounts.md)).

**The one exception, and the suite handles it itself.** `/sign-up` is rate
limited by a single counter shared by every visitor (its budget is the
constants in `features/auth/signUpRateLimit.ts`,
[ADR-0055](../docs/adr/0055-self-registration-via-keycloak.md) says why), and
a full run spends about five attempts — so without clearing it, a few
consecutive runs exhaust the window and every registering spec starts timing
out on Keycloak's `#username`, saying nothing about rate limiting. The
worker-scoped `valkey` fixture and the automatic `signUpBudget` fixture in
`e2e/support/keycloakAccount.ts` clear the counter before each test, so a spec
importing `test` from that support file needs no setup of its own. A spec that
imports `test` straight from `@playwright/test` does not get this — if it
registers, it either switches to the shared `test` or reaches
`e2e/support/valkey.ts`'s `clearSignUpRateLimit` itself. The failure signature
is in [docs/ci-playbook.md](../docs/ci-playbook.md).

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
  [ADR-0012](../docs/adr/0012-orval-api-client.md). The real tree passes every
  policy, so each one also has a fixture in `eslint-fixtures/boundaries/` that
  breaks it, linted by `eslint.config.test.ts` at a path inside the layer it
  exercises; a new or rewritten policy gets one too. The fixtures sit in no
  layer, so `npm run lint` ignores their imports, but `tsc` still checks them,
  which keeps each one importing a file that exists.
- **A feature never reaches into another feature — `app/` composes them.**
  When one feature's page needs another's affordance (the catalog's pages
  carry cellar's add-to-cellar button), the host component takes a slot —
  `BeerList`'s `renderActions` render prop, `BeerDetailsView`'s `actions`
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
  itself. On the server it writes one JSON object per line, with the call's
  `fields` merged in; in the browser it passes through to the console. Never
  put a token, a password, a request body or a query string in a field
  ([ADR-0013](../docs/adr/0013-logging-conventions.md)).
- **No `dangerouslySetInnerHTML`** — enforced by ESLint's `react/no-danger`
  rule, closing one of the vectors the CSP's `'unsafe-inline'` trade-off
  ([ADR-0016](../docs/adr/0016-security-response-headers.md)) depends on
  staying clear; `innerHTML`, `eval` and inline `<script>` still rely on that
  ADR's manual survey.

**Data and state**

- **Client-component data goes through TanStack Query** — `useQuery`/`useMutation`,
  never hand-rolled `fetch` + `useState` ([ADR-0008](../docs/adr/0008-tanstack-query.md)).
  A component calls a feature-owned hook wrapping it (`useAddBottle`),
  never `useQuery`/`useMutation` directly — the hook owns the query key and
  any `invalidateQueries` a sibling mutation needs against it
  ([ADR-0041](../docs/adr/0041-tanstack-query-feature-owned-hooks.md)).
- **Client UI state goes in feature-scoped Zustand stores**, never API data or
  state that should survive a reload ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **Stateful forms use react-hook-form + Zod.** Submitting navigates → native
  GET form; submitting mutates or validates → this stack
  ([ADR-0010](../docs/adr/0010-react-hook-form-zod.md)).
- **The generated API client** (`@kalia/api/generated/*`) is reachable only from a
  feature's own `api.ts` and `types.ts`, which wrap it, and from those only
  its shared `models/` and the tag named after the feature (the models boundary
  covers operations only; one DTO can belong to several tags) — enforced by
  ESLint ([ADR-0012](../docs/adr/0012-orval-api-client.md),
  [ADR-0083](../docs/adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)). It is also never edited
  by hand — regenerate it with `make api-drift` from the repository root.
  `.claude/settings.json` denies agents `Edit` in `packages/api/src/generated/`, since a regeneration discards a hand-edit without
  a word.
- **API failures are a tagged `ApiError`** — branch on `e.kind`, never a
  message. A non-2xx status is *not* raised: a 404 from `getBeer` means "no
  such beer" ([ADR-0023](../docs/adr/0023-typed-api-failures.md)).

**Auth**

- **Sessions are Auth.js's `"database"` strategy, backed by a hand-written
  Valkey adapter** (`lib/auth/valkeyAdapter.ts`) — never add a second
  session mechanism or switch to the `"jwt"` strategy without reading
  [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md) first.
- **`signIn` from `auth.ts` ends any local session before it starts**
  (`lib/auth/endingLocalSession.ts`), and every sign-in action calls that one.
  Do not export Auth.js's own `signIn` instead: with a live session Auth.js links
  the account Keycloak returns to the signed-in user, so a second person
  signing in on the browser would be filed under the first one's identity and
  carry their tokens. Nothing fails
  ([ADR-0089](../docs/adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
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
- **`kaliaFetch` attaches the bearer token; callers never do.** (`lib/api/mutator.ts`
  is the web's transport around `@kalia/api`'s fetch core; `instrumentation.ts`
  registers it at startup, and a generated call made before that throws.) An expired one,
  or one whose account records no expiry, is renewed first, and if it cannot
  be, no token is sent at all rather than a bad one — the backend answers 401
  to a bad token even on a public route, so sending one breaks anonymous
  catalog browsing for a signed-in user. A caller-set `Authorization` header
  makes `kaliaFetch` throw an `ApiError` of kind `refused` and send nothing
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md),
  [ADR-0029](../docs/adr/0029-silent-token-refresh.md)).
- **Per-user data keys on the access token's `sub`**, which the backend reads
  itself ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) —
  never on an Auth.js user or session id, which are this app's own.
- **`POST /api/auth/backchannel-logout` is intentionally unauthenticated** —
  Keycloak calls it server-to-server with no session cookie, as `web:3000` over
  the compose network (the edge answers `404` for it), and the Logout
  Token's own signature (verified against Keycloak's JWKS,
  `lib/auth/backchannelLogoutToken.ts`) is what stands in for one. It ends
  the session matching the token's `sid` only, never falling back to `sub`:
  that would silently widen a single-session logout into signing the user out
  everywhere, undoing [ADR-0030](../docs/adr/0030-per-session-token-storage.md)'s
  per-device precision for this one caller
  ([ADR-0031](../docs/adr/0031-backchannel-logout.md)).

**UI**

- **Localization is i18next**, every route under `app/[locale]/…`; strings in
  `packages/locales/src/{en,fi}/common.json` (the `@kalia/locales` package;
  i18n initialisation stays here, in `i18n/` and `app/providers.tsx`; [ADR-0011](../docs/adr/0011-i18next-localization.md)).
  The Keycloak auth pages are the exception — Keycloak translates those, not
  i18next; the sign-in actions pass `ui_locales`
  ([ADR-0056](../docs/adr/0056-branded-bilingual-keycloak-pages.md)).
- **Design tokens are two-layer**: components reference the semantic layer
  (`--color-primary`), never raw primitives (`--cobalt-700`). Shared primitives
  live in `components/ui/` ([ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md)).
  **Never write a hex, `rgb()` or `hsl()` colour, a Tailwind default-palette
  class (`bg-zinc-100`, `text-white`), an arbitrary colour or `font-[…]`, or a
  `var(--…)` of a primitive in a component or a `.css` file** — it renders
  correctly and fails nowhere visible until the next re-theme, so
  `scripts/check-token-styling.mjs` fails `make verify-fast` on it
  ([ADR-0066](../docs/adr/0066-token-only-styling-is-a-build-check.md)). If a
  literal is unavoidable, put `token-exception: <why>` in a comment on or above
  the line; a marker with no reason, or one excusing nothing, fails too.
  Which token an element should use is a meaning, not a value:
  [docs/design.md](../docs/design.md).
- **A page renders through `<Page>` and writes no container of its own.**
  `<Page width="text" | "wide" | "narrow">` from `components/ui/page.tsx` is the
  `<main>`, the skip link's target and the page's column, so a route's
  `page.tsx`, `loading.tsx`, `error.tsx` and `not-found.tsx` all wrap their
  content in it rather than in a `<main className="mx-auto …">`
  ([ADR-0067](../docs/adr/0067-page-shell-sticky-bar-and-page-component.md)).
- **A page title is `PageTitle` and a section heading is `SectionHeading`**,
  from `components/ui/`; no page or feature writes an `<h1>` or `<h2>` itself.
  `PageTitle` always renders the `h1`, at the page title's sizes or, with
  `size="name"`, the profile's username. `SectionHeading` renders the `level`
  its caller passes, in the `heading` or `label` look ([docs/design.md](../docs/design.md)
  says which). ESLint (`no-restricted-syntax` in `eslint.config.mjs`) fails
  a hand-written one in `app/` or `features/`; a heading that is neither, such
  as a beer's name heading its own row, takes
  `{/* eslint-disable-next-line no-restricted-syntax -- <why> */}` on the line
  above, and one left behind after its heading goes fails as unused
  ([ADR-0073](../docs/adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- **`components/ui/` is hand-written and dependency-free, with two exceptions:
  `dialog.tsx` wraps `@radix-ui/react-dialog` and `toast.tsx` wraps
  `@radix-ui/react-toast`.** What each is for is in
  [ADR-0021](../docs/adr/0021-design-tokens-ui-primitives.md); what an editor
  must keep is that the behaviour they supply (focus trap and restore, `Escape`,
  `aria-live` announcement, auto-dismiss) fails silently when hand-rolled, and
  that no other primitive may take a UI dependency without amending that ADR
  again.
  Icons are hand-drawn in `icon.tsx` rather than installed, because an icon is
  appearance ([ADR-0065](../docs/adr/0065-imagery-icons-and-mark-specimen.md)).
- **Loading/error/empty states have a fixed shape**: `loading.tsx` per route
  with a shape-matched skeleton, one `app/[locale]/error.tsx` app-wide,
  `EmptyState` for an empty list or section, and `SignInPrompt` — an
  `EmptyState` with a sign-in button and a sign-up link — for a page that
  needs signing in. Both are in `components/ui/`, so a feature fills
  `SignInPrompt` with its own strings and its own sign-in Server Action
  rather than copying it
  ([ADR-0022](../docs/adr/0022-loading-error-empty-states.md)).

**Testing**

- Component tests live next to the component (`page.test.tsx` beside `page.tsx`).
- Every full `render(...)` adds `import { axe } from "jest-axe";` then
  `expect(await axe(container)).toHaveNoViolations();` (matcher registered
  once in `vitest.setup.ts`). WCAG 2.2 AA is the bar
  ([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)),
  enforced at three layers: `eslint-plugin-jsx-a11y` at lint time, `jest-axe`
  here, and `@axe-core/playwright` scanning real pages at E2E time, through
  `e2e/support/a11y.ts`'s `expectNoA11yViolations` — a spec calls that rather
  than building its own `AxeBuilder`, so the tag scope stays one decision
  instead of one per file. **2.2's checks need layout, which jsdom does not
  do, so they run only at E2E:** axe's `target-size` there, and Focus Not
  Obscured as `e2e/support/keyboard.ts`'s `tabTo`, which asserts it at every
  Tab stop. A sticky or fixed element added to a page belongs on a keyboard
  flow in `e2e/keyboard-flows.spec.ts`, or nothing checks that it hides no
  focused control. All three ride the existing lint/test/e2e
  commands — there is no separate a11y gate to forget.
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
  `buildCspHeader` in `lib/config/cspHeader.ts` in the same PR, or the browser
  silently blocks it. Verify in the browser console, not just a successful
  build ([ADR-0016](../docs/adr/0016-security-response-headers.md)).
- **Never navigate to another origin with a real `<form>`** — `form-action
  'self'` blocks it, *including* when the form posts to our own route and
  that route answers with a cross-origin redirect. Use a Server Action and
  `redirect()`, whose navigation the client router performs instead (that is
  why sign-out is `federatedSignOut`, not a route handler —
  [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)). **`curl` does not
  enforce CSP and will happily follow the redirect**, so this only reproduces
  in a browser — check the console, not just the response headers. **Until
  the page hydrates, a Server Action form *is* a real form**: clicked then,
  it posts natively, the action runs, and only its redirect is blocked — so
  sign-out deletes the local session, leaves Keycloak's, and the page sits
  there still showing the user signed in. Do not swap `AuthSubmitButton`
  (`features/auth/`) back for a plain submit button on a form whose action
  redirects cross-origin; it stays disabled until hydration commits.
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
  component that actually caused it. `lib/api/mutator.ts` imports
  `server-only`, so a direct import now fails at that line instead. Route the
  call through a `"use server"` action in the feature's `actions.ts` instead
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
  `node_modules/next/dist/docs/` (at the repository root) before relying on
  memory — see
  [AGENTS.md](AGENTS.md), which already caught `middleware.ts` → `proxy.ts`.
