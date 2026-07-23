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
8. [ ] UI design: preliminary design for Kalia — minimalistic and hipstery feel; consult the product owner on colors, fonts and functionality; centralize the look in themes/design tokens; keep a future design-system extraction possible. Outcome: a professional, production-grade look
9. [ ] Standard loading, error and empty states: Next.js `loading.tsx`/`error.tsx` conventions plus shared UI patterns, applied to the catalog pages *(added by agent: without a standard, every feature invents its own)*

**Done when:** decisions 1–6 are documented and the existing code migrated to them; catalog pages pass automated WCAG 2.1 AA checks; the UI implements the new design with both Finnish and English translations; all suites green.

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

Findings from periodic architecture and documentation sweeps (plus security,
from iteration 3 onward) land here, categorized **MUST** / **SHOULD** /
**COULD** (MoSCoW) — see CLAUDE.md "Quality checks". Empty until the first
sweep runs.

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
