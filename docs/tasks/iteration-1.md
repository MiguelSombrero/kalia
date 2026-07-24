# Iteration 1 — Beer catalog: browse & search

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
