# Iteration 4 — Authentication (Keycloak)

Goal: users can sign in; personal features become possible.

1. [x] Keycloak + Valkey in docker-compose, realm export committed
2. [x] Next.js: OIDC Authorization Code + PKCE flow, Valkey-backed session, sign-in/out UI

   Closed Quality backlog MUST-1: `app/api/auth/[...nextauth]/route.ts`
   and `app/api/auth/federated-signout/route.ts` are now real `app/api/*`
   route handlers, and `docs/architecture.md` §5/§6 updated to match.
   Design decisions (Auth.js + a custom Valkey adapter, not a hand-rolled
   client; the internal/public Keycloak-address split) recorded in
   [ADR-0025](../adr/0025-authjs-valkey-adapter.md). No silent token
   refresh yet — see task 8.
3. [ ] Spring Boot as OAuth2 resource server; `identity` module resolves the current user; catalog endpoints stay public
4. [ ] Playwright E2E: sign in, see own name in the UI, sign out

**Done when:** a user can sign in and out; the backend knows who is calling on protected endpoints; browsing needs no account.

8. [ ] Silent token refresh: renew the access token via the refresh token
   before it expires, extending the session instead of requiring sign-in
   again. Deferred out of task 2 by product-owner decision — task 2's
   session TTL simply tracks the access token's lifetime for now.

## Maintenance (lifted from the quality backlog)

5. [ ] Fix stale/contradictory documentation surfaced by the 2026-07-23 and
   2026-07-27 quality sweeps: `README.md` and `docs/adr/0011-i18next-localization.md`
   both still claim `react-i18next` is "installed but not yet wired," but
   `frontend/app/providers.tsx` wires a real `I18nextProvider` (fix the
   README line; add an **Amended** note to ADR-0011, don't silently rewrite
   its Decision section); `README.md` states the Keycloak version
   independently in two places with no single source of truth (collapse to
   one canonical mention); `docs/architecture.md` §8's "no caching / no
   Redis on the backend yet" still says Redis and reads oddly next to §6's
   Valkey session-store dependency (reword to scope it to backend
   read-caching and rename to Valkey); `docs/architecture.md`'s example of
   what forces a client component (search input) is stale — `SearchFilters`
   is itself a server component per ADR-0010.
   *(Quality backlog 2026-07-27 MUST-2; 2026-07-23 SHOULD-6; 2026-07-27
   COULD-10, COULD-11)*
6. [ ] Harden the ArchUnit/Modulith test suite ahead of new modules: add a
   deliberately-violating test fixture proving `ArchitectureTest` /
   `ModularityTest` actually fail on a real violation (today's rules are
   only exercised against a compliant one-module codebase); add a
   code-level guard (ArchUnit/Modulith rule) that fails the build if a
   protected module (e.g. `cellar`) exists without the `identity` module's
   resource-server/security config in place. Best timed with task 3's
   `identity` module — the first real second module the suite will ever
   see.
   *(Quality backlog 2026-07-27 SHOULD-3, SHOULD-4)*
7. [ ] Backend hardening: escape `%`/`_` wildcard metacharacters in user
   search input before building the `LIKE` pattern in
   `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java`
   (concrete repro: seed data contains `'Gueuze 100% Lambic Bio'`, so
   searching `10%` currently over/under-matches); add a doc note that the
   dev Postgres password (`docker-compose.yml`, falls back to the literal
   `kalia`) is a fixed dev-only value never safe beyond localhost, matching
   the pattern task 1 already established for the Keycloak/Valkey dev
   secrets.
   *(Quality backlog 2026-07-27 SHOULD-2, superseding 2026-07-23 COULD-4;
   2026-07-23 SHOULD-1)*
