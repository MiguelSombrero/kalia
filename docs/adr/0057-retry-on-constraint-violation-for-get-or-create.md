# ADR-0057: A get-or-create write retries once on its own unique-constraint violation, each attempt its own transaction

- **Status:** accepted
- **Date:** 2026-09-11

## Context

`CellarService.addBottles` (`backend/src/main/java/fi/kalia/cellar/application/CellarService.java`)
does a read-then-create: `entryFor` looks up the caller's `cellar.entry` row
for a (user, beer) pair and creates one if absent, all inside one
`@Transactional` method. Two first-ever add-bottle requests for the same pair,
arriving concurrently, both see no entry and both insert; the second commit
trips the `UNIQUE (user_id, beer_id)` constraint
(`V005__cellar_schema.sql:14`), and nothing maps the resulting
`DataIntegrityViolationException` to a response — the backend's error-handling
convention (`backend/README.md`) deliberately lets broad exception types fall
through to a message-less 500. The losing request's whole transaction rolls
back, so its bottles are never persisted: a 500 on a write that silently loses
data, from a plausible double-click rather than a contrived race.

The product owner confirmed on 2026-09-04 (quality backlog MUST-8) that the
losing request must succeed transparently, appending to the winner's entry,
and on 2026-09-11 redirected the implementation mechanism away from the
refined task's original choice (adding `spring-retry` as a dependency) once
Spring Framework 7.0.9's own `org.springframework.resilience` package —
already on the classpath as a `spring-context` transitive, not a new
dependency — was confirmed to cover the same need (`mvn -o dependency:tree`
shows `spring-context:7.0.9`;
[Spring Framework reference: Resilience](https://docs.spring.io/spring-framework/reference/core/resilience.html)).
This narrow case is the only one in scope; the existing-entry concurrent-add
path loses no bottles today (child `bottle` rows insert under distinct ids,
and quantity is always derived rather than stored — ADR-0034), so it needed
no change.

This ADR exists because the pattern — catch a write's own unique-constraint
violation and retry the get-or-create, each attempt in a fresh transaction —
is one a later module (profile, feed) could hit with its own get-or-create
shape, and the reasoning for *why* a retry must sit outside the transactional
proxy boundary, and why that turned out to already be true here, would not
survive in the code once written.

## Decision

**`CellarService.addBottles` retries once via Spring Framework's
`@org.springframework.resilience.annotation.Retryable`, scoped to
`DataIntegrityViolationException`, with a `@Configuration` class enabling
`@EnableResilientMethods(proxyTargetClass = true)`.** On the constraint
violation the method is called again; the retry's own `entryFor` now finds
the winner's committed entry and appends to it instead of inserting a second
one.

This relies on (and is the reason it earns an ADR rather than staying
implicit in the code) the retry advisor attaching *outside* the existing
`@Transactional` advisor on `CellarService`'s proxy, so a retried attempt
starts a genuinely fresh transaction rather than re-entering one Spring has
already marked rollback-only. `RetryAnnotationBeanPostProcessor` (Spring
Framework 7.0.9, `org.springframework.resilience.annotation`) is built for
exactly this: its `postProcessAfterInitialization` finds `CellarService`'s
bean already wrapped in a CGLIB proxy (from `@Transactional`) and, because its
constructor calls `setBeforeExistingAdvisors(true)`
(`AbstractAdvisingBeanPostProcessor`), inserts its own retry advisor at
position 0 of that proxy's existing advisor chain — outermost, ahead of the
transactional advisor — rather than creating a second, nested proxy whose
relative ordering would depend on `BeanPostProcessor` registration order.
`proxyTargetClass = true` on `@EnableResilientMethods` only matters for a
target with no proxy yet (`CellarService` already has one here, from
`@Transactional`); it is set anyway since `CellarService` has no interface,
so a future caller of the same pattern on an unproxied bean is covered too.

Scope is deliberately narrow: one `@Retryable` method, one module. No shared
helper is extracted — no second module has the same get-or-create shape yet,
so sharing the mechanism is deferred until one does.

## Alternatives considered

**`spring-retry` (`@EnableRetry`/`@Retryable` from
`org.springframework.retry`)** — the refined task's original choice, and
still a reasonable one in general. Rejected once Spring Framework 7's own
resilience support was confirmed to cover the same requirement (per-exception
matching, bounded retries, a delay) already on the classpath: reading the
cached Spring Boot 4.1.1 BOM (`spring-boot-dependencies-4.1.1.pom`) showed
`spring-retry` is no longer BOM-managed as of Boot 4.x (it was, at `2.0.12`,
in Boot 3.5.5's BOM), so adding it now would also mean pinning its version by
hand and adding `spring-boot-starter-aop` for annotation-driven proxying —
two new dependencies where the standard library already has zero.

**HTTP 409 Conflict returned to the losing request.** Rejected per the
product owner's 2026-09-04 decision: the losing request's bottles must
persist, not just fail distinguishably from a 500.

**A Postgres `ON CONFLICT` upsert in `EntryRepository`.** Rejected: the
get-or-create shape is a two-step read-then-branch (the branch also checks
`catalog.beerExists`, not just "does an entry exist"), not a single upsertable
statement, and folding that into raw SQL would move logic out of
`CellarService` and duplicate the catalog-existence check.

## Consequences

- Good, because two concurrent first-ever add-bottle requests for the same
  (user, beer) now both succeed, each getting its own bottles back, against
  exactly one shared `entry` row.
- Good, because no new dependency was added — the mechanism is part of
  `spring-context`, already a transitive dependency of `spring-boot-starter-webmvc`.
- Bad, because the retry advisor's position depends on
  `RetryAnnotationBeanPostProcessor`'s `beforeExistingAdvisors = true`
  behavior, which is not obvious from `@Retryable`'s own Javadoc and is
  specific to Spring Framework 7.0.9 — a library upgrade that changed this
  would fail silently (the retry would still run, just inside the
  transactional boundary, rolling back attempt 2 as well) unless
  `ConcurrentAddBottleApiIT` is kept green.
- Neutral, because the retry is scoped to `DataIntegrityViolationException`
  only; any other exception from `addBottles` propagates on the first
  attempt exactly as before, unaffected by this change.
- Neutral, because `includes` matches the exception *type*, not the specific
  `entry_user_id_beer_id_key` constraint: a future, unrelated constraint on
  `cellar.entry`/`cellar.bottle` would also get one silent retry (re-running
  `entryFor`, including the `catalog.beerExists` check) before surfacing the
  same unmapped 500 it does today. Narrowing further would need a
  `MethodRetryPredicate` inspecting the constraint name, which is more
  machinery than this single call site has earned while only one constraint
  exists on either table.
- **Revisit trigger:** if a second module needs the same get-or-create-retry
  shape, factor the `@Retryable` spec and the proxy-ordering reasoning above
  into a shared note (or helper, if the shape matches closely enough) instead
  of re-deriving it per module. Revisit too if `cellar.entry`/`cellar.bottle`
  gains a second constraint, or if ADR-0053's domain events land on `Entry`:
  confirm a discarded attempt's event never publishes before its transaction
  rolls back, and that a retried attempt registers exactly one, not two.

## Evidence

Verified against Spring Boot 4.1.1 / Spring Framework 7.0.9 (this backend's
pinned versions, `backend/pom.xml`):

- `spring-boot-dependencies-4.1.1.pom` (resolved locally) has no
  `org.springframework.retry` entry at all; `spring-boot-dependencies-3.5.5.pom`
  manages `spring-retry` at `2.0.12`, confirming the drop is specific to
  Boot 4.x rather than an oversight in this project's pom.
- `spring-context-7.0.9.jar` contains
  `org/springframework/resilience/annotation/{Retryable,EnableResilientMethods,RetryAnnotationBeanPostProcessor}.class`
  and `org/springframework/resilience/retry/MethodRetrySpec.class` — the
  native annotation-driven retry support the decision relies on.
- `javap -v` on `Retryable.class` confirms its defaults: `maxRetries=3`,
  `delay=1000` (ms). `CellarService.addBottles` overrides both
  (`maxRetries = 1, delay = 0`): exactly one retry (two attempts total, per
  the task's `@Retryable(maxAttempts = 2)` framing), with no artificial delay
  — the retry's own re-read already finds the winner's committed row, so
  waiting buys nothing.
- `javap -v` on `EnableResilientMethods.class` confirms `proxyTargetClass`
  defaults to `false` and `order` to `2147483646`; decompiling
  `RetryAnnotationBeanPostProcessor`'s constructor
  (`javap -p -c RetryAnnotationBeanPostProcessor.class`) shows the
  `setBeforeExistingAdvisors(true)` call backing the ordering claim above.
- `fi.kalia.cellar.web.ConcurrentAddBottleApiIT` fires two concurrent
  `POST /api/v1/cellar/bottles` requests for the same never-before-added
  (user, beer) pair, synchronized on a `CyclicBarrier` so both observe "no
  entry" before either inserts. Confirmed to fail against the pre-fix code
  with `500 Internal Server Error` on the losing request (Postgres:
  `duplicate key value violates unique constraint "entry_user_id_beer_id_key"`);
  against the fix, both requests return `201 Created`, and the database holds
  exactly one `entry` row with both requests' bottles. Run 9 times locally;
  8 passed, 1 failed on an unrelated Testcontainers/Ryuk connectivity error
  (`Could not connect to Ryuk at localhost:…`), not a race outcome.
