# Backlog

Unscheduled work — not yet assigned to an iteration.

Product ideas the [vision](../../README.md) names but nothing is being built
on. None of these is a decision anyone is making yet, which is why none of them
has an ADR ([ADR-0032](../adr/0032-when-a-decision-earns-an-adr.md)):

- **Beer ratings, sourced from elsewhere.** A 1–5 average from an existing beer
  platform (Untappd, Pint Please, …), shown on a beer. Kalia never collects
  reviews itself — that boundary is settled and is in the vision. Which source,
  and whether one is available on acceptable terms, is not.
- **Where to buy.** A beer's page listing shops that stock it, and what they
  charge. Entirely dependent on whether beer retailers publish usable APIs;
  distant. Kalia links out and does not sell — there is no basket, no checkout
  and no payment in this idea.
- **Likes and comments on feed events**, once the feed
  ([iteration 7](iteration-7.md)) exists.
- Recommendations ("if you liked this IPA…")
- Following other users, so a feed can be personal rather than global
- Admin UI + role-based access for catalog management

Engineering work:

- Observability: structured logs, metrics, tracing
- Deployment target + IaC. **A prerequisite for the mobile client below**, not
  merely adjacent to it: both the Spring API and Keycloak become
  internet-facing, since a phone runs the OIDC flow against Keycloak itself and
  calls the API directly. Today the API is bound to `127.0.0.1:8080`.
- GDPR: account deletion, data export, and the consent story — becomes real
  the moment anyone but the author uses this
- Search engine — PostgreSQL full-text is fine at this size; OpenSearch only if
  faceted search outgrows it
- Minimum length for the catalog search term. Shorter than three characters
  yields no complete trigram, so the name filter falls back to a full scan
  despite its index ([ADR-0044](../adr/0044-catalog-search-indexes.md)).
  Imposing one is an API-contract change, so it is a decision to make rather
  than a fix to apply
- **A failing token refresh is silent.** `frontend/lib/auth/refreshAccessToken.ts`
  returns `unavailable` and the caller sends no token, so a Keycloak outage
  looks exactly like ordinary anonymous browsing — nothing logs, nothing
  counts it ([ADR-0029](../adr/0029-silent-token-refresh.md)). Found while
  building refresh; deliberately not fixed there, because a single
  `frontend/lib/logger.ts` call at this one site, with no metrics or tracing
  to count or alert on it, would still leave a Keycloak outage effectively
  invisible. Belongs with the structured-logs/metrics/tracing item above.
- **401 responses carry no body**, unlike every other error in the API, which
  is RFC 9457 problem+json (`docs/architecture.md` §4,
  [ADR-0014](../adr/0014-shared-exception-handling.md)). Spring Security's
  `BearerTokenAuthenticationEntryPoint` answers with headers only — found
  while verifying [ADR-0028](../adr/0028-resource-server-and-current-user.md).
  Not urgent: the frontend already handles a bodyless error response. **The
  trap when fixing it:** that entry point sets the `WWW-Authenticate` header
  RFC 9110 requires on a 401, and a naive `ProblemDetail` replacement carries
  no headers and would silently drop it — the identical defect ADR-0014
  records for the 405 `Allow` header. Any fix needs a test pinning both the
  body and the header.
- **The Keycloak realm export is hardcoded to localhost**, and one of the
  hardcoded values is a credential. Also a prerequisite for the mobile client
  below, which needs a second client in this realm with its own redirect URIs.
  `keycloak/realm-export.json` pins the
  `kalia-frontend` client's `redirectUris`, `webOrigins` and
  `post.logout.redirect.uris` to `http://localhost:3000`, `sslRequired` to
  `none`, the client secret to `kalia-dev-secret` in plaintext, and
  `testuser`'s password to `testuser123` — so the realm cannot be imported
  anywhere but a dev machine, and the committed secret plus a known-password
  account become live credentials the moment it is. Blocks the deployment
  item above. Keycloak's startup import resolves `${VAR}` placeholders from
  environment variables, which lets one committed file serve every
  environment with the values supplied per deployment; the compose service
  would then carry today's literals as its own environment
  ([docker-compose.yml](../../docker-compose.yml)), leaving local development
  unchanged. **The trap when fixing it:** a placeholder that does not resolve
  does not necessarily stop the server — depending on how the importer treats
  it, the realm either fails to import or imports with the literal
  `${KALIA_FRONTEND_URL}` as its redirect URI, and both leave a *healthy*
  Keycloak serving a realm that silently rejects every sign-in. Compounding
  it, `--import-realm` skips a realm that already exists, so a second attempt
  against the same database changes nothing. Any fix has to be verified from
  an empty database (`docker compose down -v`) with an automated check that
  the imported realm's redirect URI matches the configured frontend origin —
  asserting the container started proves nothing.
- **The frontend's import boundaries have no violating fixture**, unlike the
  backend's ArchUnit rules, which are re-run against
  `backend/src/test/java/archfixture/` for exactly this reason
  (`docs/architecture.md` §7). A green `npm run lint` proves the layer config
  in `frontend/eslint.config.mjs` parses, not that any rule still fires: a
  mistyped element pattern or a reordered descriptor would pass silently
  ([ADR-0012](../adr/0012-orval-api-client.md)). Every rule was verified by
  hand when it was written (iteration 5 task 05), which is a one-time check,
  not a guard. **The trap when fixing it:** a fixture tree that lint is
  expected to *fail* on has to live somewhere `tsc`, Vitest and `next build`
  all ignore, and the check has to assert the failure rather than run
  `eslint` and pass on a zero exit code.

## Mobile client

A React Native / Expo app is planned after [iteration 8](iteration-8.md),
carrying at least the catalog, cellar, profile and feed. Nothing here is
scheduled and nothing is decided. This section exists for a narrower reason:
the decisions being made *now*, in iterations 5–8, are the API contract a
second client would inherit, and a client that ships through an app store
cannot be redeployed in lockstep with the backend. Choices that are reversible
today stop being reversible then. Written up 2026-08-08 from an architecture
analysis the product owner asked for.

### What already works in mobile's favour

The backend needs no structural change to serve a second client. It is already
an OAuth2 resource server validating signature, `iss` and `aud`
([ADR-0028](../adr/0028-resource-server-and-current-user.md)); it keys per-user
data on the Keycloak `sub` rather than on anything a client supplies; it holds
no session and no user table; primary keys are UUIDs throughout; and it
publishes an OpenAPI spec any client generator can consume
([ADR-0012](../adr/0012-orval-api-client.md)).
[ADR-0003](../adr/0003-bff-pattern.md) named this outcome as a consequence at
the time — "Backend stays a clean, UI-agnostic REST API — usable by other
clients later" — and it held.

[ADR-0030](../adr/0030-per-session-token-storage.md) is the other piece that
already behaves correctly: a phone would get its own session and its own
Keycloak `sid`, so signing out on the phone leaves the laptop signed in.

### What does not carry over

**The BFF is a rendering layer, not an API layer.** `frontend/app/api/` holds
only Auth.js's own routes; every catalog read runs server component →
`kaliaFetch` → Spring. There is no JSON surface for a mobile app to reuse, so
mobile calls Spring directly as its own OAuth client. That does not contradict
[ADR-0003](../adr/0003-bff-pattern.md), which is about *the browser* — but two
of its stated consequences, "no CORS surface" and "the Spring API is not
exposed publicly", stop being true system-wide the day mobile ships.

**The auth setup is web-session-shaped.** A confidential client with a
plaintext secret, Valkey-backed sessions, a cookie, a backchannel-logout URL
pointing at a container, and a 10-hour `ssoSessionMaxLifespan`. Mobile needs a
public client with PKCE and no secret, a refresh token in Keychain/Keystore,
and a session measured in months (`offline_access`). Nothing in
[ADR-0025](../adr/0025-authjs-valkey-adapter.md),
[ADR-0029](../adr/0029-silent-token-refresh.md),
[ADR-0030](../adr/0030-per-session-token-storage.md) or
[ADR-0031](../adr/0031-backchannel-logout.md) blocks that — they are all
frontend-scoped — but none of it is reusable either. Back-channel logout in
particular cannot reach a device at all, so a mobile client has to end its own
session when a refresh fails.

**Almost none of `frontend/` is shareable.** `components/ui/` is DOM-bound and
`app/` is Next routing. What *is* platform-neutral, or nearly so:
`lib/api/generated/` (regenerated for the second client from the same spec),
the feature `types.ts` files, `i18n/locales/{en,fi}/common.json`, and the token
*values* behind [ADR-0021](../adr/0021-design-tokens-ui-primitives.md) — though
not in the form they are authored, which is CSS custom properties. Sharing any
of it needs npm workspaces, which this repo does not have;
[architecture.md §7](../architecture.md) already carries the revisit trigger,
"if a second frontend client appears".

### Decisions to make when mobile begins

Each is ADR-shaped and none is decided:

1. **Does mobile call Spring directly, or through a BFF of its own?** Directly
   is the expected answer — the BFF exists to keep secrets out of a *browser*,
   and a native app necessarily holds its own credentials — but a mobile BFF is
   the alternative if per-screen aggregation turns out to hurt.
2. **An API compatibility policy.** A mobile app cannot be redeployed in
   lockstep with the backend: store review takes days and some users never
   update. `/api/v1` needs an additive-only rule, a statement of what triggers
   `/api/v2`, and a deprecation window. This is the discipline mobile forces
   that nothing else would.
3. **Keycloak client topology** — a public `kalia-mobile` client, PKCE, no
   secret, custom-scheme and app-link redirect URIs, and **its own
   `kalia-backend` audience mapper**: without one its tokens fail the backend's
   audience check, which presents as a broken sign-in rather than as a missing
   mapper. Plus whether mobile gets `offline_access`.
4. **Repo layout and code sharing** — npm workspaces, whether `frontend/`
   becomes `web/`, and which of the shareable layers above become packages.
   The rename is best done inside the workspaces change, when that churn is
   already being paid, rather than as a change of its own.
5. **Design token format.** [ADR-0021](../adr/0021-design-tokens-ui-primitives.md)'s
   two-layer CSS custom properties are web-only as authored. Either a
   platform-neutral source generates both, or the two platforms keep separate
   token sets and drift.
6. **Offline behaviour for the cellar.** The deepest question, because a cellar
   is used in a cellar, which is exactly where there is no signal. Read-only
   cache, or offline writes with sync? The questions this analysis added to
   [iteration 5](iteration-5.md)'s task files exist to keep the second option
   open, not to build it.
7. **Push notifications**, which need device registration *and* a personal
   feed. [Iteration 7](iteration-7.md) builds a global one, so "following other
   users" above becomes a prerequisite rather than a nice extra.
8. **A mobile testing strategy.** Playwright cannot drive a native app.
9. **Public API exposure** — TLS, rate limiting, and an anonymous catalog that
   will be scraped.

### Must exist in the app's first release, or never

Once an app is installed, nothing can be added that the *already-installed*
version has to honour. Two things therefore ship in v1.0 or are permanently
unavailable:

- **A minimum-supported-version check**, read from the server, that the app can
  block itself on. Without it every future breaking change is impossible for
  the lifetime of the product, because v1.0 clients keep calling.
- **A maintenance / kill-switch signal** — same reasoning, cheaper form.

Expo's over-the-air updates soften this for JavaScript-only changes, which is a
real argument for that stack, but they do not cover native module changes and
do not reach a user who never opens the app. The version check is still
required.

### Product gaps mobile makes urgent

- **Beers have no images, and nothing in the roadmap adds them.** A cellar
  without bottle photos reads as a spreadsheet on a phone. Needs storage, a
  CDN, responsive variants — and moderation, once users upload.
- **Barcode scanning** is the one thing a mobile cellar app does that the web
  cannot: scan the bottle in your hand and it is in your cellar. It needs an
  EAN/UPC column on `catalog.beer`, which is why
  [iteration 8 task 01](iteration-8/01-catalog-data-source.md) now asks whether
  a candidate data source carries barcodes. **The trap:** the column itself can
  be migrated in at any time, so this looks deferrable — but nobody re-scans a
  catalog of beers that already exist, so a source chosen without barcodes
  leaves the feature permanently half-covered.
- **Crash reporting**, which the observability item above does not cover — that
  one is server-shaped. Device identifiers and push tokens are personal data,
  so this lands on the GDPR item too.

### Worth knowing, not mobile's to fix

- `/api/v1/breweries` returns the whole table unpaginated
  ([quality backlog](quality-backlog.md) COULD-4). A phone on a slow connection
  is where that finding stops being theoretical.
- **Does the project's own process scale to a third codebase?** CLAUDE.md,
  [ADR-0020](../adr/0020-documentation-roles.md)'s three homes, the doc-sync
  gate, `check-tasks.mjs` and the `api-client-drift` CI job all assume two
  apps, and [architecture.md §5](../architecture.md) is titled "Frontend
  design", singular. In a project whose first goal is the process, this ranks
  above the feature.
- **[ADR-0012](../adr/0012-orval-api-client.md)'s rejection of a committed
  OpenAPI spec is worth revisiting, not reversing.** Its reasoning holds, but
  with two generated clients each regenerating against a live backend, the
  drift check costs Docker-in-CI per client, and a mobile CI runner may not
  have one.
