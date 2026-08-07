# ADR-0007: DDD-lite package structure inside Modulith modules

- **Status:** accepted
- **Date:** 2026-07-21
- **Amended:** 2026-08-07 — the rules below moved from `ArchitectureTest` into
  `ArchitectureRules`, built around a base package instead of hard-coding
  `fi.kalia`, so they can also be run against a deliberately violating
  fixture. Until then a compliant codebase was the only thing they had ever
  been run against, where a rule matching no classes passes exactly like a
  rule that holds (iteration 4 task 6)

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

- Inside each Modulith module, **DDD-lite layers as direct subpackages**:
  `domain` (rich JPA entities, value objects, repositories, specifications),
  `application` (use-case services, exceptions designed as API responses),
  `web` (controllers, ProblemDetail advice, HTTP DTOs with `@Schema`,
  entity→DTO mapping at the boundary). No `internal` wrapper — Modulith
  treats every subpackage as internal by default.
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
