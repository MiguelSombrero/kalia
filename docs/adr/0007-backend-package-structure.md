# ADR-0007: DDD-lite package structure inside Modulith modules

- **Status:** accepted
- **Date:** 2026-07-21
- **Amended:** 2026-08-07 — the two `noClasses()` layering rules below are now
  also run against a deliberately violating fixture, and take a base package
  so they can reach it. They are the rules no production class triggers, so a
  wrong condition in them was indistinguishable from a satisfied one; the
  placement rules need no such fixture, since real entities and controllers
  exercise them every run (iteration 4 task 6)
- **Amended:** 2026-08-23 — the layer enumeration in Decision's first bullet
  restated `docs/architecture.md` §3's shape almost verbatim
  ([ADR-0020](0020-documentation-roles.md)); it is now a pointer there, and
  this ADR keeps the why (iteration 5.5 task 01)

## Context

The backend used Spring Modulith's minimal idiom: the module root package as
public API (holding the HTTP DTOs), one flat `internal` package for
everything else. Two problems surfaced in product-owner review: the flat
internal package mixed web, application, domain and persistence concerns,
and the root package conflated two roles — the contract other modules import
and the web adapter's response shapes (HTTP DTOs carrying `@Schema` sat in
the module's public surface). The PO's default elsewhere is DDD + hexagonal;
full hexagonal ceremony (ports/adapters everywhere, framework-free domain
with separate JPA entities) was weighed and rejected for this codebase.

## Decision

- Inside each Modulith module, **DDD-lite layers as direct subpackages**
  instead of Modulith's flat `internal` package — Modulith treats every
  subpackage as internal by default, so no `internal` wrapper is needed.
  Current layer contents:
  [docs/architecture.md §3](../architecture.md#3-backend-modules).
- **Hexagonal dependency direction**: web → application → domain, never
  inward-out. Application returns domain types; mapping to DTOs happens in
  web (consequence: repositories eager-load lazy relations needed by the
  boundary, e.g. `BeerRepository.findById` uses an entity graph, because
  mapping runs outside the service transaction).
- **Module root package is the inter-module API** and stays empty until the
  first real consumer (cellar) arrives — the API emerges from its consumer.
- **Rich JPA entities are the domain model** — a deliberate exception to
  framework-free-domain purity; separating domain classes from JPA entities
  would double every module's mapping surface for little gain at this scale.
- **Full ports/adapters ceremony is deferred** to modules whose domain earns
  it (payment's `PaymentProvider`, ordering's state machine).
- **ArchUnit 1.4.2 enforces the rules as tests** (`ArchitectureTest`): layer
  dependency direction, controllers/advice only in `web`, entities and
  repositories only in `domain`, plus general coding rules (no field
  injection, no standard streams, no java.util.logging). Module *boundaries*
  remain verified by Spring Modulith (`ModularityTest`).
- `@Nullable` (JSpecify) + `@Schema` co-location on web DTOs was reviewed
  and accepted: they document the same contract to two audiences.

## Consequences

- `catalog` restructured accordingly; pure refactor — JSON shapes and API
  behavior unchanged, verified by the untouched integration-test assertions.
- Future modules follow this blueprint from birth; the ArchUnit rules apply
  to them automatically via package patterns (`fi.kalia.*.domain..` etc.).
- Architecture violations fail the build in the unit-test phase (fast, no
  Docker), not in review.
