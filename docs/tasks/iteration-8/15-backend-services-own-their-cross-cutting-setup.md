# Task 15: Backend services stop leaning on hidden setup

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

Four small findings in the backend application layer, each a place where a
service works because of something it cannot see.

**`profile`'s race protection is switched on by a class inside `cellar`.**
The only `@EnableResilientMethods` is `cellar/application/RetryConfig.java:6-9`.
`ProfileService`'s two `@Retryable` methods (`:50`, `:59`) depend on it for
[ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)'s
protection against the concurrent first-sign-in race. An
`@ApplicationModuleTest` of `profile`, or moving cellar's config, silently
turns those retries into plain method calls, and Modulith cannot see the
dependency.

**The anonymous public-cellar path opens read-write transactions.**
`CellarService` (`:20`) and `ProfileService` (`:18`) put a class-level
read-write `@Transactional` over their read methods. `CatalogService` and
`FeedService` mark their reads `readOnly = true`.

**The "brewed in the future" rule reads the JVM's clock and zone.**
`Bottle.java:81-87` calls `LocalDate.now()` in the default zone, while its
comment's "+14:00 max offset" argument assumes UTC. That is true of the
container today but was never pinned. With no injectable `Clock`, the rule
cannot be tested at a fixed instant either, and it is a rule about a
boundary.

**`ProfileService.isCellarPublic` (`:24-26`) is referenced only by tests.**

(Quality backlog SHOULD-43, COULD-33, COULD-34 and COULD-32.)

## Scope

Method-level resilience is enabled at the application level and proven for
`profile` on its own, read methods run read-only, the future-date rule takes
its time from an injected `Clock` and is tested at the boundary, and the dead
method is gone.

## Non-goals

- What "today" means for the future-date rule. That was decided by
  iteration-6.5 task 12 (retired MUST-9: the client's local day), and this
  task keeps it.
- Concurrent last-bottle removal losing a just-added bottle — quality backlog
  COULD-30, still `[needs decision]`.

## Constraints

- Application-wide configuration belongs outside any one module's
  `application` package ([ADR-0007](../../adr/0007-backend-package-structure.md)).
- A `@Retryable` method that calls another on the same bean bypasses the
  proxy. The existing comment at `ProfileService.java:56` warns about this,
  and moving the config must not change it.
- `readOnly = true` on a method that writes fails at runtime, not at compile
  time. Every method marked read-only must be checked to perform no writes.

## Open questions

1. **Where does the shared `Clock` bean live, and in which zone?** UTC matches
   the comment's argument. The JVM's default matches today's behaviour by
   accident.

## Acceptance criteria

- [ ] An `@ApplicationModuleTest` of `profile` alone shows the concurrent
      first-sign-in retry still happening — integration test, confirmed to
      fail while the only enabling config sits in `cellar`
- [ ] The public-cellar read and the other read methods of `CellarService`
      and `ProfileService` run in read-only transactions — integration test
- [ ] The future-date rule is tested at a fixed instant either side of
      midnight UTC, with the clock injected — unit test
- [ ] `isCellarPublic` and its test-only callers are removed
- [ ] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest`
      pass

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-43, COULD-33,
COULD-34 and COULD-32, all confirmed 2026-10-14. Merged because each one is a
small change to the same two services (`CellarService`, `ProfileService`) and
the `cellar` domain they call, and separately they would be four PRs of a few
lines each.
