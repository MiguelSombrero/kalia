# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each numbered task below is meant
to be **one issue / one PR**: implemented test-first, reviewed, and merged
before the next begins. Update this file as iterations complete or plans
change.

Priorities follow the beer-enthusiast side of the vision first
([ADR-0006](adr/0006-cellar-first.md)): catalog → authentication → personal
beer cellar. The store flow (basket, ordering, payment) lives in the backlog
until the own-store vs. store-aggregator decision is made.

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
5. [ ] Dockerfiles for backend and frontend; `docker compose up` starts the full stack (PostgreSQL + backend + frontend)

**Done when:** a single `docker compose up` brings up database, backend and frontend, and the app answers on localhost; all test suites run green locally and in CI.

## Iteration 1 — Beer catalog: browse & search

Goal: a visitor can browse and search real (seeded) beers.

1. [ ] `catalog` module: schema + Flyway migrations for `brewery` and `beer`, seed data (~50–100 beers)
2. [ ] `GET /api/v1/beers` with filtering (query, style, breweryId, country, minAbv/maxAbv) + pagination/sorting; `GET /api/v1/beers/{id}`; `GET /api/v1/breweries`
3. [ ] Frontend catalog page: beer list with search box and filters driven by URL search params (server components via BFF)
4. [ ] Frontend beer detail page
5. [ ] Playwright E2E: search for a beer → open its detail page

**Done when:** a user can find "Westvleteren" by name or filter Belgian quads between 9–12 % ABV, and open beer details.

## Iteration 2 — Authentication (Keycloak)

Goal: users can sign in; personal features become possible.

1. [ ] Keycloak + Redis in docker-compose, realm export committed
2. [ ] Next.js: OIDC Authorization Code + PKCE flow, Redis-backed session, sign-in/out UI
3. [ ] Spring Boot as OAuth2 resource server; `identity` module resolves the current user; catalog endpoints stay public
4. [ ] Playwright E2E: sign in, see own name in the UI, sign out

**Done when:** a user can sign in and out; the backend knows who is calling on protected endpoints; browsing needs no account.

## Iteration 3 — Personal beer cellar

Goal: a signed-in beer enthusiast maintains the catalog of beers they own.

1. [ ] `cellar` module: schema + migrations (owned beers: beer reference, quantity, vintage/bottled year, purchase date and price, notes), domain rules as unit-tested logic
2. [ ] Cellar REST API (authenticated): list own cellar, add beer from catalog, update quantity/details, remove
3. [ ] Frontend: cellar page (list with age, quantity, details), add-to-cellar from beer list/detail pages
4. [ ] Playwright E2E: sign in → add a beer to cellar → edit quantity → remove it

**Done when:** a signed-in user can add a beer from the catalog to their cellar and see its age and quantity; another user cannot see it.

## Iteration 4+ — Backlog (unordered)

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
