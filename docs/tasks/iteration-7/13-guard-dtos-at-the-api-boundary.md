# Task 13: Make "DTOs at the API boundary" a rule the build enforces

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

"DTOs at the API boundary — JPA entities never serialize directly"
([architecture.md §4](../../architecture.md)) is the one §3/§4 layering rule
with no automated guard, in a codebase that enforces every rule next to it:
layer direction by ArchUnit, module boundaries by Spring Modulith, frontend
imports by `eslint-plugin-boundaries`.

It is also the rule most likely to be broken by accident, because the
architecture **deliberately hands domain entities outward** —
`CellarService.listBottles` returns `List<Bottle>` to `web`, and a controller
method is one `return` away from serialising it. A handler that returns
`Bottle` instead of `BottleDto` publishes `entry.userId` to the caller and
trips a lazy collection, with **no test, no lint and no build failure**: the
response is a 200 with more fields than it should have. That is the exact class
of rule CLAUDE.md says keeps its warning inline — one whose violation fails
silently.

[Task 02](02-feed-api.md) adds a public endpoint returning data belonging to
many users at once, which is the worst place in the app for an accidental
entity serialisation, and [task 01](01-feed-module.md) adds the module whose
entities it would be.

(Quality backlog SHOULD-14.)

## Scope

An ArchUnit rule that fails the build when a controller method returns, or a
`@RestController`'s signature otherwise exposes, a JPA entity — plus the
violating fixture that proves the rule fires.

## Non-goals

- Changing any existing response. Every controller is believed compliant today;
  if the rule finds a violation, fixing it is in scope and changing the
  documented shape of a response is not.
- Stopping `application` from returning entities to `web`. That is deliberate
  ([ADR-0052](../../adr/0052-cellar-aggregate-owns-its-writes.md) keeps writes
  on the aggregate root and the service layer hands the root outward); the
  boundary being guarded is the HTTP one, not the layer one.
- Request bodies. Worth asking about — see question 2 — but the finding and the
  documented rule are about serialisation outward.

## Constraints

- **The rule must be proven to fire.** A `noClasses()` rule that no production
  class violates passes whether or not its condition is right, which is why
  those rules are re-run against `backend/src/test/java/archfixture/`
  ([architecture.md §7](../../architecture.md)). This rule joins that set; a
  green build is not evidence.
- Detection has to see through wrappers. A controller returning
  `List<Bottle>`, `Page<Beer>`, `ResponseEntity<Entry>` or `Optional<Profile>`
  is the same violation as returning the entity bare, and a rule matching only
  the raw return type passes all four — which would be worse than no rule,
  because it would look like coverage.
- What counts as "a JPA entity" is `@Entity`-annotated types, which is
  mechanically decidable; a rule phrased as "types in a `domain` package"
  would also catch value objects and projections that are legitimately
  serialisable.
- [ADR-0007](../../adr/0007-backend-package-structure.md) is where the layer
  rules live and `ArchitectureTest` is where they are written.

## Open questions

1. **Does the rule belong in `ArchitectureTest` or its own test class?** It is
   an HTTP-boundary rule rather than a layer-direction rule, and the existing
   class is about layers.
2. **Does it cover request bodies too?** A `@RequestBody Bottle` lets a caller
   set any field on an entity, including ids and the owner. No controller does
   it today. Guarding both directions costs little now; guarding one and
   discovering the other later costs a second conversation.
3. **What about the generated OpenAPI spec?** An entity leaking into a response
   also leaks into the published schema and then into the frontend's generated
   client ([ADR-0012](../../adr/0012-orval-api-client.md)) — so `api-client
   drift` would show it as a diff. Whether that counts as a second guard worth
   naming, or a coincidence not to rely on, is worth a line in the answer.

## Acceptance criteria

- [ ] A controller method returning a JPA entity fails the build — ArchUnit
      rule, run against a violating fixture under
      `backend/src/test/java/archfixture/`, and confirmed to fail there
- [ ] The rule catches an entity wrapped in `List`, `Page`, `Optional` and
      `ResponseEntity`, each proven by its own fixture rather than by one case
      standing in for four
- [ ] Every existing controller passes the rule unchanged, or the response that
      does not is fixed in this task and its change described
- [ ] `docs/architecture.md` §7's testing table lists the new guard, so a reader
      editing a controller learns a test exists before CI tells them
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-14, confirmed
2026-08-30 and re-confirmed 2026-09-12. Lifted now because
[tasks 01](01-feed-module.md) and [02](02-feed-api.md) add a module and a
public multi-user endpoint — the rule is cheapest to add before the code it
would guard is written, not after.
