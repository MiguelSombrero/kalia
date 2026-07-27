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

- **SHOULD-1** `docker-compose.yml:9,47` — the dev Postgres password falls back to the hardcoded literal `kalia` with no warning against reusing this config beyond localhost. (`application.properties` itself has since been fixed to require `POSTGRES_PASSWORD` with no default — corrected reference, reconfirmed still open in the 2026-07-27 sweep.)
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
- ~~**COULD-8** `docker-compose.yml`'s backend healthcheck is a bare `/dev/tcp` port-open probe...~~ — resolved: the healthcheck now polls `/actuator/health` (confirmed by the 2026-07-27 sweep's documentation-quality pass).

No architectural violations, no HIGH/CRITICAL security vulnerabilities, no injection/XSS surface, and no secrets in the repo were found. All 12 ADRs still accurately reflect current code; ArchUnit/Modulith layering matches `docs/architecture.md` §3 exactly.

## Sweep 2026-07-27

Architecture · documentation · code-quality · security, full codebase.
Three items from the 2026-07-23 sweep — `MUST-2` (BFF proxy doc drift),
`SHOULD-1` (hardcoded Postgres password default), `SHOULD-4`/`COULD-4`
(unindexed/unescaped `LIKE` search) — were independently reconfirmed as
still open by multiple dimensions this sweep and are not re-listed below;
see the corrected `SHOULD-1` above.

**MUST**

- **MUST-1** `README.md:20` status banner still says iteration 3 is "next," but `docs/roadmap.md:37` and `docs/tasks/iteration-3.md` (all 14 tasks) show it's done.
- **MUST-2** `README.md:113` and `docs/adr/0011-i18next-localization.md:33` both claim `react-i18next` is "installed but not yet wired," but `frontend/app/providers.tsx` wires a real `I18nextProvider` and `docs/adr/0022-loading-error-empty-states.md` documents that wiring explicitly.

**SHOULD**

- **SHOULD-2** `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:17` — `LIKE` wildcard metacharacters (`%`/`_`) in user search input aren't escaped, and this now has a concrete failure case: the seed data contains `'Gueuze 100% Lambic Bio'` (`V004__catalog_seed_data.sql:72-73`), so searching for e.g. `10%` over- or under-matches instead of treating `%` literally. Strengthens the 2026-07-23 sweep's `COULD-4` with a real repro.
- **SHOULD-3** `backend/src/test/java/fi/kalia/ArchitectureTest.java` / `ModularityTest.java` — the layering rules match ADR-0007/0014 exactly but are exercised only in today's one-module codebase; no fixture proves a rule actually fails on a real violation, so CI's "fails on illegal cross-module dependencies" claim is unverified until a second module lands or a deliberately-violating test fixture is added.
- **SHOULD-4** **[needs decision]** No structural guard (e.g. an ArchUnit rule) stops a future protected module (e.g. `cellar`) from landing before iteration 4's auth/resource-server config is in place — raised independently by both the architecture and security passes. Needs a call on mechanism and scope, not just a yes/no.
- **SHOULD-5** **[needs decision]** `backend/src/main/resources/db/migration/common/V001__create_module_schemas.sql:4-6` pre-creates `cart`/`ordering`/`payment` schemas, which is itself the "own store" outcome of the store-model choice `docs/architecture.md` §9 calls deliberately undecided (ADR-0006). Not urgent — nothing is built on these schemas yet — but the empty schemas lower the path-of-least-resistance cost of building the own-store cart directly, ahead of the ADR §9 says is required first. Needs a call: rename/drop the schemas until the decision is made, or accept the bias as harmless per ADR-0006's rationale.
- **SHOULD-6** `docs/adr/0013-logging-conventions.md`'s 2026-07-27 Amended note says `backend/README.md` "keeps a summary and a link, not the restatement" of the logging conventions, but `backend/README.md:173-183` still fully restates them.
- **SHOULD-7** `docs/roadmap.md:23-28` and `CLAUDE.md:132-137` restate the "Iteration DoD gate" rule near-verbatim in both places; `docs/roadmap.md` isn't one of ADR-0020's sanctioned homes for this kind of rule.
- **SHOULD-8** `backend/README.md`'s bounded-parameter and Lombok bullets carry unlinked multi-line "why" rationale that, per ADR-0020, should have graduated to an ADR rather than living in the README.

**COULD**

- **COULD-9** **[needs decision]** `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:5,74` constructs the domain-layer `BeerSearchCriteria` directly from request parameters instead of going through an application-owned input type. Passes today's dependency-direction rules, but is a coupling shortcut worth closing (e.g. a rule requiring controllers depend only on `application` types) before `cellar`/`cart` copy the same pattern.
- **COULD-10** `docs/architecture.md` §8's "no caching / no Redis yet" trade-off sits oddly next to §6's Redis dependency for auth sessions arriving next iteration; reword to scope it explicitly to "no backend read-cache" rather than "no Redis at all."
- **COULD-11** `docs/architecture.md:203`'s example of what forces a client component (search input) is stale — `SearchFilters` (`frontend/features/catalog/SearchFilters.tsx`) is itself a server component per ADR-0010's native-GET-form choice.
- **COULD-12** `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:103` — the `sort` query parameter accepts trailing garbage (e.g. `sort=name,asc,extra`) instead of rejecting it.
- **COULD-13** `backend/src/main/resources/application.properties:39` — Actuator/Swagger exposure defaults are verified fail-safe today, but nothing automated guards that a future edit keeps them so.

No HIGH/CRITICAL security vulnerabilities, injection/XSS surface, or secrets were found. No auth system exists yet, matching the documented iteration-4 plan; the current public, read-only catalog surface has no protected endpoints to check.
