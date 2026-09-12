# Task 13: Make "DTOs at the API boundary" a rule the build enforces

- **Status:** refined
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

An ArchUnit rule that fails the build when a controller method returns, or
accepts as a request body, a JPA entity — plus the violating fixtures that
prove the rule fires.

## Non-goals

- Changing any existing response. Every controller is believed compliant today;
  if the rule finds a violation, fixing it is in scope and changing the
  documented shape of a response is not.
- Stopping `application` from returning entities to `web`. That is deliberate
  ([ADR-0052](../../adr/0052-cellar-aggregate-owns-its-writes.md) keeps writes
  on the aggregate root and the service layer hands the root outward); the
  boundary being guarded is the HTTP one, not the layer one.
- ~~Request bodies.~~ **In scope as of refinement** — see Constraints. The
  finding and the documented rule are about serialisation outward, but the
  inward direction is guarded in the same rule set.

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

**Decided 2026-09-12.**

- **The rule guards both directions** (question 2, product owner): a controller
  method may neither return a JPA entity nor accept one as a `@RequestBody`. No
  controller does either today, so nothing needs fixing and this is purely the
  cheapest moment to add it. The inward case is the more dangerous of the two —
  an entity in a response over-shares, an entity in a request body is mass
  assignment, letting a caller set any field including ids and the owner.
- **The rule lives in its own test class, not `ArchitectureTest`** (question 1).
  It is an HTTP-boundary rule; the existing class is about layer direction, and
  keeping them apart keeps each class's name honest about what breaking it
  means. **Recorded by the agent during refinement rather than asked.**
- **`api-client-drift` is a coincidence, not a second guard** (question 3), and
  the answer says so in one line. An entity leaking into a response would show
  as a diff in the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)) — but only for the outward
  direction, only if someone reads the diff, and not at all for a request body
  that was already shaped like its DTO. Relying on it would be relying on a
  side effect.

## Open questions

**None.**

## Acceptance criteria

- [ ] A controller method returning a JPA entity fails the build — ArchUnit
      rule, run against a violating fixture under
      `backend/src/test/java/archfixture/`, and confirmed to fail there
- [ ] The rule catches an entity wrapped in `List`, `Page`, `Optional` and
      `ResponseEntity`, each proven by its own fixture rather than by one case
      standing in for four
- [ ] A controller method accepting a JPA entity as a `@RequestBody` fails the
      build — ArchUnit rule with its own violating fixture, confirmed to fail
      there
- [ ] Every existing controller passes the rule unchanged in both directions,
      or the signature that does not is fixed in this task and its change
      described
- [ ] `docs/architecture.md` §7's testing table lists the new guard, so a reader
      editing a controller learns a test exists before CI tells them
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-14, confirmed
2026-08-30 and re-confirmed 2026-09-12. Lifted now because
[tasks 01](01-feed-module.md) and [02](02-feed-api.md) add a module and a
public multi-user endpoint — the rule is cheapest to add before the code it
would guard is written, not after.
