# Task 06: Route the catalog module's edges through its application layer

- **Status:** done
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`docs/adr/0007-backend-package-structure.md`'s `web → application → domain`
rule, enforced by `ArchitectureTest`, has two gaps at the catalog module's
*edges* — the boundary the rule doesn't reach because it only constrains
classes inside the three layer packages, not the module root:

- **COULD-7** — `CatalogController` constructs the domain-layer
  `BeerSearchCriteria` directly from request parameters instead of going
  through an application-owned input type, skipping `application` entirely
  for that one step.
- **COULD-11** — `CatalogApi.java` (the module's inter-module API) injects
  `BeerRepository` — a `domain` type — straight in, skipping `CatalogService`
  and the same `web → application → domain` direction every other class in
  the module follows.

Neither breaks anything today; `cellar` doesn't yet have a root-package API
of its own to copy the second pattern into, but its `package-info.java`
already says it will. Worth closing while `catalog` is still the only module
with this shape, per the product owner's 2026-08-23 decision to fix both now
rather than wait for a second module to repeat the shortcut.

## Scope

- `CatalogController` builds an application-owned input type from request
  parameters; `CatalogService` (or a mapper it owns) turns that into the
  domain-layer `BeerSearchCriteria`.
- `CatalogApi` depends on `CatalogService`, not `BeerRepository` directly.
- A new `ArchitectureTest` rule that catches a *module-root* class depending
  on a `domain` type without going through `application` — closing the gap
  for every module, not just re-fixing catalog's two instances by hand.

## Non-goals

- Any change to `BeerSearchCriteria`'s own shape or the search behavior it
  drives — this is a dependency-direction fix, not a behavior change.
- Retrofitting `cellar` or any other module — there's nothing to retrofit
  yet; the new ArchitectureTest rule is what keeps it from needing this fix
  later.

## Constraints

- [ADR-0007](../../adr/0007-backend-package-structure.md): `web →
  application → domain`, enforced by `ArchitectureTest`. This task extends
  that enforcement to module roots, it doesn't relitigate the rule itself.
- `CatalogApi.beerExists(UUID)` is `cellar`'s only current caller
  (`fi.kalia.cellar.application.CellarService`) — its public signature
  doesn't need to change, only what it depends on internally.

## Open questions

**None.**

## Acceptance criteria

- [x] `CatalogController` no longer imports or constructs
      `fi.kalia.catalog.domain.BeerSearchCriteria` directly
- [x] `CatalogApi` no longer imports `fi.kalia.catalog.domain.BeerRepository`
- [x] A new `ArchitectureTest` rule fails when a module-root class depends on
      a `domain` type without going through `application` — proven by a
      fixture test that introduces such a violation and confirms the rule
      catches it, then removes the fixture
      <br>*(the fixture is kept, not removed: `backend/README.md` requires a
      standing fixture for any rule with no production violator, which this
      rule has none of after the fix — see PR description)*
- [x] `mvn clean verify` is green

## Notes

Quality backlog: COULD-7, COULD-11. `[needs decision]` (COULD-7) resolved by
the product owner during the 2026-08-23 quality-backlog triage: fix both
findings now, in one task, rather than deferring either.
