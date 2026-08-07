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
