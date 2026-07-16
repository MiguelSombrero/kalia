# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each numbered task below is meant
to be **one issue / one PR**: implemented test-first, reviewed, and merged
before the next begins. Update this file as iterations complete or plans
change.

**Definition of done (every issue):**

- tests written and green; change verified by actually running it
- module boundaries verified (backend); lint/format clean
- **doc-sync check:** affected sections of `docs/` re-read and updated in the
  same PR — or explicitly confirmed accurate in the PR description
- completed task ticked off in this file

## Iteration 0 — Walking skeleton (scaffolding)

Goal: empty but *running* end-to-end stack with CI-able test suites.

1. [x] Monorepo layout: `backend/`, `frontend/`, `docs/`, root `docker-compose.yml` with PostgreSQL
2. [ ] Spring Boot 4.1 skeleton: Maven, Spring Modulith, Flyway wired, health endpoint, `ApplicationModules.verify()` test, Testcontainers smoke test
3. [ ] Next.js 16 skeleton: TypeScript, Tailwind, Vitest + RTL configured, one trivial passing test, placeholder home page
4. [ ] GitHub Actions: build + test both apps on push

**Done when:** `docker compose up` + both dev servers start; all test suites run green locally and in CI.

## Iteration 1 — Beer catalog: browse & search

Goal: a visitor can browse and search real (seeded) beers.

1. [ ] `catalog` module: schema + Flyway migrations for `brewery` and `beer`, seed data (~50–100 beers)
2. [ ] `GET /api/v1/beers` with filtering (query, style, breweryId, minAbv/maxAbv) + pagination/sorting; `GET /api/v1/beers/{id}`; `GET /api/v1/breweries`
3. [ ] Frontend catalog page: beer list with search box and filters driven by URL search params (server components via BFF)
4. [ ] Frontend beer detail page
5. [ ] Playwright E2E: search for a beer → open its detail page

**Done when:** a user can find "Westvleteren" by name or filter IPAs between 6–8 % ABV, and open beer details.

## Iteration 2 — Shopping basket

Goal: anonymous visitor can maintain a basket.

1. [ ] `cart` module: schema, cart + items with price snapshots, quantity rules (max per item, no unknown beers)
2. [ ] Cart REST API (`POST /carts`, `GET /carts/{id}`, `PUT /carts/{id}/items/{beerId}`)
3. [ ] BFF: `cartId` httpOnly cookie issuance and forwarding
4. [ ] Frontend: add-to-basket on list/detail, basket page with quantity editing and totals
5. [ ] Playwright E2E: add two beers, change quantity, remove one, totals correct

## Iteration 3 — Ordering

Goal: basket becomes an order.

1. [ ] `ordering` module: schema, order placement from cart (item/price snapshots), order state machine (`PLACED`, `PAYMENT_PENDING`, `PAID`, `PAYMENT_FAILED`, `CANCELLED`) as unit-tested domain logic
2. [ ] `POST /api/v1/orders` + `GET /api/v1/orders/{id}`; publishes `OrderPlaced` event; cart is closed on successful placement
3. [ ] Frontend checkout page (contact info form with Zod validation) and order confirmation page
4. [ ] Playwright E2E: basket → place order → confirmation

## Iteration 4 — Payment (mocked provider)

Goal: full purchase flow with real order lifecycle, fake money.

1. [ ] `payment` module: `PaymentProvider` port, payment entity, `MockPaymentProvider` (configurable success/failure/delay)
2. [ ] Event flow: consume `OrderPlaced` → charge via port → publish `PaymentSucceeded`/`PaymentFailed`; `ordering` updates status (integration-tested with `@ApplicationModuleTest`)
3. [ ] Frontend: payment step (mock provider UI: "pay" / "fail" buttons), order status on confirmation page
4. [ ] Playwright E2E: happy path to `PAID` and failure path to `PAYMENT_FAILED` with retry

## Iteration 5 — Authentication (Keycloak)

Goal: users can sign in; baskets and orders attach to them.

1. [ ] Keycloak + Redis in docker-compose, realm export committed
2. [ ] Next.js: OIDC code+PKCE flow, Redis-backed session, sign-in/out UI
3. [ ] Spring Boot as OAuth2 resource server; `identity` module; cart/order APIs accept authenticated user, anonymous endpoints stay for guests
4. [ ] Anonymous cart merge into user cart at sign-in
5. [ ] Order history page for signed-in users

## Iteration 6+ — Backlog (unordered)

- Real PSP sandbox adapter (Paytrail or Stripe) behind the existing port
- Inventory: stock reservations at order placement, extract `inventory` module
- Admin UI + role-based access for catalog management
- Ratings & reviews; recommendations
- Observability: structured logs, metrics, tracing
- Deployment target + IaC; age-verification/compliance if the store turns real
