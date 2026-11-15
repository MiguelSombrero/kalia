# Web code conventions

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
- **A label or colour per API enum value comes from `enumLookup()`**
  (`@kalia/api`), never a `Record` keyed by the enum: a value a newer backend
  adds then reads "Other" instead of `undefined` (ESLint,
  [packages/README.md](../packages/README.md)).
- **API failures are a tagged `ApiError`**: branch on `e.kind`, never a message.
  A non-2xx status is not raised ([ADR-0023](../docs/adr/0023-typed-api-failures.md)).

**Auth**

- **Sessions are Auth.js's `"database"` strategy on a hand-written Valkey
  adapter** (`lib/auth/valkeyAdapter.ts`); add no second mechanism and do not
  switch to `"jwt"` ([ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md)).
- **Sign in through `auth.ts`'s `signIn`**, via `signInReturningTo` ([trap](README.md#traps--do-not-fix-these)).
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
- **Token values are generated** from `packages/tokens/src/tokens.ts` by
  `node scripts/generate-tokens.mjs`; do not edit the generated stylesheets
  ([ADR-0107](../docs/adr/0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md)).
- **A page renders through `<Page width="text" | "wide" | "narrow">`** in its
  `page`, `loading`, `error` and `not-found` files, with no container of its
  own ([ADR-0067](../docs/adr/0067-page-shell-sticky-bar-and-page-component.md)).
- **A title is `PageTitle`, a section heading `SectionHeading`** (`components/ui/`),
  never a hand-written `<h1>`/`<h2>` in `app/` or `features/` (ESLint;
  [ADR-0073](../docs/adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- **`components/ui/` is hand-written and dependency-free** except Radix-wrapped
  `dialog.tsx` and `toast.tsx` ([trap](README.md#traps--do-not-fix-these)); icons are drawn in `icon.tsx`
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
