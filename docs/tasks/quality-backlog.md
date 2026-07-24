# Quality backlog

Findings from periodic `/quality-sweep` runs (architecture, documentation,
code-quality, security — all four every time) land here, numbered within
each sweep and categorized **MUST** / **SHOULD** / **COULD** (MoSCoW) —
see CLAUDE.md "Quality checks". A `**[needs decision]**` tag means the
finding needs product-owner input before it's a well-scoped task; anything
untagged is ready to implement as written.

## Sweep 2026-07-23

Architecture · documentation · code-quality · security, full codebase.

**MUST**

- **MUST-2** **[needs decision]** `docs/architecture.md:52,203-205,266` describe Next.js route handlers under `app/api/*` as an already-built BFF proxy layer ("route handlers... attach the session's auth token... and forward to Spring Boot"), but no such route handlers exist anywhere under `frontend/app` — server components call the backend directly through `frontend/lib/api/mutator.ts`. Needs a call: build the described proxy layer now, or reword the doc to match the current direct-call approach?

**SHOULD**

- **SHOULD-1** `backend/src/main/resources/application.properties:6` and `docker-compose.yml:8,33` — the dev Postgres password falls back to the hardcoded literal `kalia` with no warning against reusing this config beyond localhost.
- **SHOULD-4** `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:17-29` vs. `V003__catalog_schema.sql:23-24` — the name filter uses a leading-wildcard `LIKE '%...%'` (never index-usable), and style/country filters compare `lower(column)` against a plain (non-functional) index; invisible at current seed scale (~54 rows), will degrade as the catalog grows.
- **SHOULD-5** `frontend/features/catalog/api.ts:31-46` — `searchBeers` has no direct unit test for its status check or numeric-string coercions; only covered indirectly through page-level tests.
- **SHOULD-6** `docs/architecture.md:3` "Last updated" banner is stale (says 2026-07-19; the file was substantively edited through 2026-07-23), and `README.md:101,128` states the Keycloak version twice — both currently accurate but at risk of silently drifting apart since there's no single source of truth.

**COULD**

- **COULD-1** `README.md` tech-stack table vs. `docs/adr/0008-tanstack-query.md` through `0012-orval-api-client.md` — dependency versions are duplicated between the README and each ADR; currently consistent, but a structural drift risk.
- **COULD-2** WCAG 2.1 AA enforcement mechanism is described near-identically in three places: `frontend/README.md` and two sections of `docs/architecture.md`.
- **COULD-3** DDD-lite package-structure convention is restated in full in three places: `docs/adr/0007-backend-package-structure.md`, `docs/architecture.md` §3, and `backend/README.md`.
- **COULD-4** `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:18` — LIKE-wildcard metacharacters (`%`/`_`) in user search input aren't escaped; not an injection risk, just an untested match-semantics edge case.
- **COULD-5** `backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:35-40` — `listBreweries()` loads and sorts the whole brewery table in Java on every call, with no pagination contract on `/api/v1/breweries`; fine at current scale (~20 rows).
- **COULD-6** `frontend/features/i18n/LocaleSwitcher.tsx:21` — uses an unvalidated type assertion (`pathname.split("/")[1] as Locale`) instead of the `isLocale`/`toLocale` validation used elsewhere in the codebase.
- **COULD-7** `backend/src/test/java/fi/kalia/catalog/domain/BeerSpecificationsIT.java` / `CatalogApiIT` — missing coverage for `minAbv > maxAbv` (contradictory range) and for sorting by `style`.
- **COULD-8** `docker-compose.yml`'s backend healthcheck is a bare `/dev/tcp` port-open probe, while the `api-client-drift` CI job correctly polls `/actuator/health` — the two disagree on what "healthy" means for the same service.

No architectural violations, no HIGH/CRITICAL security vulnerabilities, no injection/XSS surface, and no secrets in the repo were found. All 12 ADRs still accurately reflect current code; ArchUnit/Modulith layering matches `docs/architecture.md` §3 exactly.
