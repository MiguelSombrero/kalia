# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each numbered task below is meant
to be **one issue / one PR**: implemented test-first, reviewed, and merged
before the next begins. Update this file as iterations complete or plans
change.

Priorities follow the beer-enthusiast side of the vision first
([ADR-0006](adr/0006-cellar-first.md)): catalog → frontend standards →
authentication → personal beer cellar. The store flow (basket, ordering,
payment) lives in the backlog until the own-store vs. store-aggregator
decision is made.

**Definition of done (every issue):**

- tests written and green; change verified by actually running it
- module boundaries verified (backend); lint/format clean
- **doc-sync check:** affected sections of `docs/` re-read and updated in the
  same PR — or explicitly confirmed accurate in the PR description
- completed task ticked off in this file

**Iteration DoD gate:** an iteration is complete only when its **"Done
when"** criteria are verified *by running them*, criterion by criterion —
not when its last task is ticked. If a criterion is unmet, add tasks to the
iteration until it is. The same check runs at planning time: an iteration's
tasks must collectively cover its "Done when", or one of the two must be
fixed.

## Iteration 0 — Walking skeleton (scaffolding)

Goal: empty but *running* end-to-end stack with CI-able test suites.

1. [x] Monorepo layout: `backend/`, `frontend/`, `docs/`, root `docker-compose.yml` with PostgreSQL
2. [x] Spring Boot 4.1 skeleton: Maven, Spring Modulith, Flyway wired, health endpoint, `ApplicationModules.verify()` test, Testcontainers smoke test
3. [x] Next.js 16 skeleton: TypeScript, Tailwind, Vitest + RTL configured, one trivial passing test, placeholder home page
4. [x] GitHub Actions: build + test both apps on push
5. [x] Dockerfiles for backend and frontend; `docker compose up` starts the full stack (PostgreSQL + backend + frontend)

**Done when:** a single `docker compose up` brings up database, backend and frontend, and the app answers on localhost; all test suites run green locally and in CI.

## Iteration 1 — Beer catalog: browse & search

Goal: a visitor can browse and search real (seeded) beers.

1. [x] `catalog` module: schema + Flyway migrations for `brewery` and `beer`, seed data (~50–100 beers)
2. [x] `GET /api/v1/beers` with filtering (query, style, breweryId, country, minAbv/maxAbv) + pagination/sorting; `GET /api/v1/beers/{id}`; `GET /api/v1/breweries`
3. [x] Frontend catalog page: beer list with search box and filters driven by URL search params (server components via BFF)
4. [x] Frontend beer detail page
5. [x] Playwright E2E: search for a beer → open its detail page
6. [x] SpringDoc OpenAPI documentation for the API and schemas (`@Tag`, `@Operation`, `@Parameter`, `@Schema`); expose Swagger UI in docker compose and reconcile docs/architecture.md so the exposure model and this decision do not contradict
7. [x] Backend test infrastructure: JaCoCo Maven plugin (measure the ≥ 80 % aim in CI); test-naming convention — unit tests `*Test`, integration tests `*IT` — with maven-surefire-plugin running units and maven-failsafe-plugin running integrations; rename existing test classes accordingly
8. [x] Backend package structure (per PO architecture discussion): ADR-0007 — DDD-lite layers `domain`/`application`/`web` directly inside each Modulith module (no `internal` wrapper; subpackages are Modulith-internal by default), hexagonal dependency direction web → application → domain (never inward-out), HTTP DTOs (with `@Schema`) live in `web`, module root package reserved for the inter-module API and stays empty until its first consumer (cellar), rich JPA entities as the domain model (documented exception to framework-free purity), full ports/adapters deferred to modules that earn it (payment, ordering). Restructure `catalog` accordingly (domain: Beer, Brewery, Money, repositories, BeerSpecifications, BeerSearchCriteria; application: CatalogService + exceptions; web: controller, exception handler, all HTTP DTOs incl. PageDto/MoneyDto; tests follow their subjects). Add ArchUnit 1.4.2 as test dependency with tests enforcing at least the layer-dependency rules, plus convention checks where valuable. Doc-sync: architecture.md §3 module blueprint + backend/README.md conventions. Pure refactor — JSON shapes and API unchanged, all suites green

**Done when:** a user can find "Westvleteren" by name or filter Belgian quads between 9–12 % ABV, and open beer details.

## Iteration 2 — Frontend standards & UI design

Goal: set the standards for UI design and development — architecture
decisions, conventions, localization, accessibility and a professional look —
so later features are easier to add and consistent by default.

1. [x] Decision: TanStack Query for API calls (scoped to client components — ADR-0008); document the decision
2. [x] Decision: Zustand for client application state — user selections only, never API data (that belongs to TanStack Query); document the decision (ADR-0009)
3. [x] Decision: react-hook-form + Zod for forms and validation; document the decision (ADR-0010)
4. [x] Convention: prefer arrow functions over explicit function declarations; document and enforce via ESLint
5. [x] i18next localization with Finnish and English translations; migrate all existing UI text to i18next (ADR-0011)
6. [x] OpenAPI-generated API clients: the backend's OpenAPI spec becomes the source of truth for its APIs. Select the tool **with the product owner** (candidate: [openapi-generator-cli](https://github.com/OpenAPITools/openapi-generator-cli), challengeable) and agree the workflow (spec file copied to frontend vs. generated against a running backend) (ADR-0012)
7. [x] Accessibility per [WCAG 2.1 level AA](https://www.w3.org/WAI/WCAG21/Understanding/conformance): retrofit existing components (aria attributes, roles, focus handling); automate accessibility testing where possible; from here on every new component/page ships accessible. Ask the product owner when something is unclear — retrofitted header landmark, skip link, focus-visible styling, `LocaleSwitcher` ARIA; enforced via `eslint-plugin-jsx-a11y`, `jest-axe`, `@axe-core/playwright`, all riding existing CI jobs (see docs/architecture.md §5/§7)
8. [x] UI design: preliminary design for Kalia — minimalistic and hipstery feel; consult the product owner on colors, fonts and functionality; centralize the look in themes/design tokens; keep a future design-system extraction possible. Outcome: a professional, production-grade look. Worth reaching for the `/frontend-design` skill for aesthetic direction if available, and `/accessibility-review` for a design-stage WCAG pass on the new tokens/components — complementary to the code-stage a11y pipeline from task 7, not a replacement for it
9. [ ] Standard loading, error and empty states: Next.js `loading.tsx`/`error.tsx` conventions plus shared UI patterns, applied to the catalog pages *(added by agent: without a standard, every feature invents its own)*

**Done when:** decisions 1–6 are documented and the existing code migrated to them; catalog pages pass automated WCAG 2.1 AA checks; the UI implements the new design with both Finnish and English translations; all suites green.

## Iteration 2.5 — Production-readiness foundations

Goal: establish the backend and frontend conventions for exception
handling, logging, configuration and security that later iterations build
on, instead of retrofitting them once Auth (session cookies, secrets) and
Cellar (first mutating endpoints) land.

**Backend**

1. [ ] Decision: structured logging conventions — SLF4J usage baseline, log levels per environment, what's logged when an exception falls through to the default handler, no secrets/PII in logs; document as an ADR
2. [ ] Decision: shared exception-handling strategy beyond `catalog`'s module-scoped advice — field-level detail for Bean Validation failures (`MethodArgumentNotValidException`/`ConstraintViolationException`), malformed-JSON/405 handling, and where module-neutral advice can live without breaking ADR-0007's ArchUnit placement rule **[needs decision]**; document as an ADR
3. [ ] Decision: configuration/profile strategy — split `application.properties` into base + `dev`/`test`/`prod` profiles, how secrets differ per profile; document as an ADR
4. [ ] Explicit actuator endpoint exposure (`management.endpoints.web.exposure.include`) instead of relying on undeclared defaults *(Quality backlog 2026-07-23, SHOULD-8)*
5. [ ] Input-validation hardening as an applied convention: `minAbv <= maxAbv` cross-field check, an upper bound on ABV params, and `@Size` caps on free-text `query`/`style`/`country` *(Quality backlog 2026-07-23, SHOULD-3)*

**Frontend**

6. [ ] Harden `kaliaFetch`: guard `JSON.parse` against non-JSON error bodies *(Quality backlog 2026-07-23, MUST-3)*, add a request timeout, and introduce a typed `ApiError` distinguishing network/timeout/HTTP-status/parse failures — feeds the error-state work in task 9 above
7. [ ] Decision: security response headers (CSP, X-Frame-Options, Referrer-Policy, HSTS, Permissions-Policy) via `next.config.ts` `headers()` *(Quality backlog 2026-07-23, SHOULD-2)*; document as an ADR
8. [ ] Decision: environment-variable validation — fail fast on misconfigured/missing env vars instead of silent fallback defaults; document as an ADR
9. [ ] Client-side logging convention: a thin logger wrapper replacing ad hoc `console.*` calls, so a real monitoring tool can be swapped in later without touching call sites

**Cross-cutting**

10. [ ] Dependency-vulnerability scanning in CI: a Maven check (e.g. OWASP dependency-check) alongside an `npm audit` gate *(Quality backlog 2026-07-23, SHOULD-7)*

**Done when:** an unhandled backend exception is logged server-side with no
internal detail leaked to the client; an invalid ABV range or malformed
request returns a 400 with field-level detail; actuator exposes only the
intended endpoints; dev/test/prod each run off their own profile with no
hardcoded secrets; a non-JSON backend error response no longer crashes the
frontend and renders a friendly, accessible error state instead; every
response carries the agreed security headers; CI fails on a known-vulnerable
dependency in either app.

## Iteration 3 — Authentication (Keycloak)

Goal: users can sign in; personal features become possible.

1. [ ] Keycloak + Redis in docker-compose, realm export committed
2. [ ] Next.js: OIDC Authorization Code + PKCE flow, Redis-backed session, sign-in/out UI
3. [ ] Spring Boot as OAuth2 resource server; `identity` module resolves the current user; catalog endpoints stay public
4. [ ] Playwright E2E: sign in, see own name in the UI, sign out

**Done when:** a user can sign in and out; the backend knows who is calling on protected endpoints; browsing needs no account.

## Iteration 4 — Personal beer cellar

Goal: a signed-in beer enthusiast maintains the catalog of beers they own.

1. [ ] `cellar` module: schema + migrations (owned beers: beer reference, quantity, vintage/bottled year, purchase date and price, notes), domain rules as unit-tested logic
2. [ ] Cellar REST API (authenticated): list own cellar, add beer from catalog, update quantity/details, remove
3. [ ] Frontend: cellar page (list with age, quantity, details), add-to-cellar from beer list/detail pages
4. [ ] Playwright E2E: sign in → add a beer to cellar → edit quantity → remove it

**Done when:** a signed-in user can add a beer from the catalog to their cellar and see its age and quantity; another user cannot see it.

## Iteration 5+ — Backlog (unordered)

### Quality backlog

Findings from periodic `/quality-sweep` runs (architecture, documentation,
code-quality, security — all four every time) land here, numbered within
each sweep and categorized **MUST** / **SHOULD** / **COULD** (MoSCoW) —
see CLAUDE.md "Quality checks". A `**[needs decision]**` tag means the
finding needs product-owner input before it's a well-scoped task; anything
untagged is ready to implement as written.

**Sweep — 2026-07-23** (architecture · documentation · code-quality · security, full codebase)

**MUST**

- **MUST-1** `README.md:20-24` status blurb says iterations 0–1 are complete and iteration 2 is "next," but 7 of iteration 2's 9 tasks are already checked off in `docs/roadmap.md:62-68` — reads as if iteration 2 hasn't started when it's nearly done.
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

Store flow — **pending decision** (own store vs. aggregator over other beer
stores, "Trivago for beers"; needs an ADR before implementation):

- Own store variant: `cart` module (ADR-0004), `ordering` with order state
  machine and `OrderPlaced` events, `payment` behind a `PaymentProvider` port
  with a mock adapter first (ADR-0005), checkout UI, real PSP later
- Aggregator variant: price/availability search across external beer stores,
  linking out to the cheapest shop

Other backlog items:

- Beer reviews — **pending decision**: own reviews vs. integration with an
  existing service (Untappd, Pint Please, …)
- Inventory / stock management (if own store is built)
- Admin UI + role-based access for catalog management
- Recommendations ("if you liked this IPA…")
- Observability: structured logs, metrics, tracing
- Deployment target + IaC; age-verification/compliance if the store turns real
