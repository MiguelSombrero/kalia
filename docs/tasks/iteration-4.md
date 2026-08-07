# Iteration 4 — Authentication (Keycloak)

Goal: users can sign in; personal features become possible.

1. [x] Keycloak + Valkey in docker-compose, realm export committed
2. [x] Next.js: OIDC Authorization Code + PKCE flow, Valkey-backed session, sign-in/out UI

   Closed Quality backlog MUST-1: `app/api/auth/[...nextauth]/route.ts` is
   now a real `app/api/*` route handler, and `docs/architecture.md` §5/§6
   updated to describe what actually exists. Design decisions (Auth.js + a
   custom Valkey adapter, not a hand-rolled client; the internal/public
   Keycloak-address split; sign-out as a Server Action so the CSP's
   `form-action 'self'` can stay strict) recorded in
   [ADR-0025](../adr/0025-authjs-valkey-adapter.md). Two follow-ups left
   deliberately out: silent token refresh (task 8) and per-session rather
   than per-user token storage (task 9).
3. [x] Spring Boot as OAuth2 resource server; `identity` module resolves the current user; catalog endpoints stay public

   The filter chain denies by default; the catalog reads, `/actuator/health`
   and the API docs are the permitted set. Tokens are checked for signature,
   issuer and a `kalia-backend` audience — a new realm client plus an audience
   mapper, since tokens previously carried no audience any resource server
   could check. `GET /api/v1/me` returns the caller, giving the iteration's
   "the backend knows who is calling" something to verify against. The
   Keycloak `sub` is the canonical per-user key, so `cellar_item.user_id`
   (iteration 5) keys on it rather than on the frontend's Auth.js session id.
   Recorded in [ADR-0028](../adr/0028-resource-server-and-current-user.md).
   Found while verifying: an invalid bearer token makes Spring Security answer
   401 even on a `permitAll` route, so the BFF withholds expired tokens —
   without that, browsing broke for any signed-in user five minutes after
   sign-in. That workaround is task 8's to remove.
4. [x] Playwright E2E: sign in, see own name in the UI, sign out
   (`frontend/e2e/sign-in-out.spec.ts`). Two of the three specs are
   regression guards for bugs found in review, and each was verified to
   fail against the build that had the bug — the CSP-blocked sign-out, and
   the stale `id_token_hint` that made Keycloak ask to confirm the logout.

8. [x] Silent token refresh: renew the access token via the refresh token
   before it expires, extending the session instead of requiring sign-in
   again. Deferred out of task 2 by product-owner decision — task 2's
   session TTL simply tracks the access token's lifetime for now.
   Task 3 raised the stakes: the realm's `accessTokenLifespan` is 300 seconds
   while the Auth.js session outlives it, so today a signed-in user loses
   access to protected endpoints five minutes after signing in.
   `lib/api/accessToken.ts` withholds the expired token so public browsing
   keeps working; delete that workaround, and its tests, when refresh lands.

   Landed as [ADR-0029](../adr/0029-silent-token-refresh.md): renewal is lazy,
   at the one point every backend call already passes through, and the
   withholding workaround is gone. The decision worth recording beyond that is
   the split by failure kind — `invalid_grant` ends the local session because
   the grant behind it is gone, while an unreachable Keycloak leaves it alone,
   since treating a restart as a mass sign-out would be the worse failure.
   Sessions are now capped to the realm's SSO session lifetime, and the
   realm's token/session lifetimes are pinned in `keycloak/realm-export.json`
   at the values its defaults were already producing. Back-Channel Logout —
   the proactive counterpart, which would make `invalid_grant` the rare path
   rather than the common one — stays with task 9, where it was already noted.
9. [x] Key the stored Keycloak tokens per session, not per user.
   `frontend/lib/auth/valkeyAdapter.ts` keeps one record per user
   (`auth:account:{userId}`), so it always holds only the most recent
   sign-in's tokens — that overwrite is deliberate, being the `events.signIn`
   hook task 2 added to stop tokens freezing at the first-ever sign-in. The
   cost is multi-device: with the same user signed in twice, signing out on
   one device sends the *other's* `id_token_hint`, ending the wrong Keycloak
   SSO session and leaving the signing-out browser still authenticated at
   the identity provider. This bears on this iteration's "a user can sign in
   and out" rather than being polish — sign-out stops being a reliable
   sign-out as soon as a second device exists. Likely shape: store the
   provider token set keyed by the Auth.js session token and have
   `signOutEverywhere` (`frontend/features/auth/actions.ts`) read the set
   belonging to the session being ended; `getStoredAccountByUserId` is
   already an out-of-interface extension and is the natural place to change.
   Worth checking at the same time whether OIDC Back-Channel Logout should
   invalidate local sessions when Keycloak ends an SSO session, since today
   a Keycloak-side logout leaves Kalia's session records alive until their
   TTL. Evidence this is real, not theoretical:
   `frontend/e2e/sign-in-out.spec.ts` is forced to run `mode: "serial"`
   because concurrent sign-ins clobber each other's tokens — drop that
   constraint if this fix removes the need for it.
   *(Found while adding task 4's E2E coverage.)*

   Landed as [ADR-0030](../adr/0030-per-session-token-storage.md). The shape is
   the one this task guessed at, with one thing it did not: Auth.js hands the
   session and the tokens to two different callbacks and neither sees the
   other, so the two are joined by a request-scoped `AsyncLocalStorage` entered
   around the auth route handlers. `getStoredAccountByUserId` is gone rather
   than changed — a per-user lookup is the defect, so it should not remain
   available. `signOutEverywhere` is renamed `federatedSignOut`: sign-out ends
   this device's session only, by product-owner decision, and the old name read
   as "all devices".
   The E2E `mode: "serial"` **stays**, and the answer to this task's question is
   no: measured, parallel fails 3 of 5 specs against the old build and 1–2 of 6
   against the new one, so token clobbering was only half of that reason.
   Overlapping authentication flows for a single realm user are the other half,
   and giving each spec its own seeded user is what would remove it.
   Back-Channel Logout is task 10, by product-owner decision.
10. [ ] OIDC Back-Channel Logout: let Keycloak tell Kalia that an SSO session
    has ended, and invalidate the matching local session. Today the propagation
    runs one way only — Kalia's sign-out ends the Keycloak session, but a
    Keycloak-side logout (admin console, session revocation, another client's
    RP-initiated logout) leaves Kalia's session record alive until its TTL,
    which [ADR-0029](../adr/0029-silent-token-refresh.md) caps at the realm's
    10-hour SSO maximum. That ADR names this as the proactive counterpart to
    its reactive `invalid_grant` handling, and its revisit trigger.
    Split out of task 9 by product-owner decision, and dependent on it: the
    per-session token storage [ADR-0030](../adr/0030-per-session-token-storage.md)
    introduced is the prerequisite, since a logout token identifies the session
    to end by `sid`/`sub` and there was previously no per-session record to
    match against. Note this adds an *unauthenticated public* endpoint that
    accepts a JWT from Keycloak — validating the logout token (signature,
    issuer, audience, the `events` claim, and that it is not an ID token) is
    the security-sensitive part, alongside the realm client attributes
    (`backchannel.logout.url`, `backchannel.logout.session.required`) that turn
    it on. Needs a session index by `sid` to find what to delete.

**Done when:** a user can sign in and out; the backend knows who is calling on protected endpoints; browsing needs no account.

## Maintenance (lifted from the quality backlog)

5. [x] Fix stale/contradictory documentation surfaced by the 2026-07-23 and
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
6. [x] Harden the ArchUnit/Modulith test suite ahead of new modules: add a
   deliberately-violating test fixture proving `ArchitectureTest` /
   `ModularityTest` actually fail on a real violation (today's rules are
   only exercised against a compliant one-module codebase); add a
   code-level guard (ArchUnit/Modulith rule) that fails the build if a
   protected module (e.g. `cellar`) exists without the `identity` module's
   resource-server/security config in place. Best timed with task 3's
   `identity` module — the first real second module the suite will ever
   see.
   *(Quality backlog 2026-07-27 SHOULD-3, SHOULD-4)*

   The fixture lives in `backend/src/test/java/archfixture/` and breaks every
   rule at once; each meta-test asserts the failure *names the offending
   type*, which is what makes it a proof rather than a "something threw".
   Two constraints shaped it. It cannot live under `fi.kalia` — Spring's
   component scan and Hibernate's entity scan cover test classes there, so a
   fixture `@Entity` would fail schema validation in every `@SpringBootTest`
   — which is why the rules moved into `ArchitectureRules` and take a base
   package ([ADR-0007](../adr/0007-backend-package-structure.md), amended).
   Only the base package varies; the pattern shape around it is shared, so
   the typo that makes a rule match nothing is exactly what the fixture
   catches. The guard is unconditional rather than keyed to a list of
   protected modules, by product-owner decision: the chain must exist, live
   in `identity` and configure `oauth2ResourceServer`, and no other module
   may configure web security ([ADR-0028](../adr/0028-resource-server-and-current-user.md),
   amended). Deleting the chain trips `allowEmptyShould(false)` — the one
   failure mode no violating class can stand in for. Each direction was
   verified by mutation: a stray chain in `catalog` fails three rules, a
   chain with no `@Bean` fails two, and a typo in a package pattern fails the
   fixture test that would otherwise have hidden it.
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
