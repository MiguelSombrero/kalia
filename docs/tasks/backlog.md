# Backlog

Unscheduled work — not yet assigned to an iteration.

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
