# ADR-0002: Spring Modulith backend, not microservices

- **Status:** accepted
- **Date:** 2026-07-15

## Context

The domain splits naturally into subdomains (catalog, cart, ordering, payment,
identity), and a future migration to microservices should stay possible. But
the project is a solo learning project with no scale requirements.

## Decision

Build one Spring Boot deployable structured as Spring Modulith modules, one
per subdomain. Module boundaries are enforced by `ApplicationModules.verify()`
in CI. Cross-module writes go through application events; cross-module reads
through each module's small public API. Each module owns its own PostgreSQL
schema; cross-module references are by id only, no cross-schema foreign keys.

## Consequences

- Monolith operational simplicity (one process, one DB, one deploy) with
  microservice-style seams.
- Event-driven checkout flow (`OrderPlaced` → payment → `PaymentSucceeded`/
  `PaymentFailed`) works in-process now and maps to a message broker later.
- Extracting a module into a service later means moving a schema and swapping
  in-process events for messaging — no untangling of shared tables.
- Cost: boundary discipline; some data is duplicated as snapshots (e.g. order
  items copy beer name/price) instead of joined across modules.
