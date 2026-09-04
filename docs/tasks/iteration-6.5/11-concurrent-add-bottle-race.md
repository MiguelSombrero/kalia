# Task 11: Fix the concurrent add-bottle 500 and lost write

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

Two "add a bottle" requests for the same beer, arriving at the same time for a
user who has no entry for that beer yet, end in a 500 and **no bottles
persisted at all**.

`CellarService.addBottles` calls `entryFor(userId, beerId)`
([CellarService.java:74](../../../backend/src/main/java/fi/kalia/cellar/application/CellarService.java)),
which does a read-then-`Entry.create` with nothing between the read and the
insert. Both requests see no entry, both insert, and the second commit trips
the `UNIQUE (user_id, beer_id)` constraint on `cellar.entry`
([V005__cellar_schema.sql:14](../../../backend/src/main/resources/db/migration/cellar/V005__cellar_schema.sql)).
Nothing maps the resulting `DataIntegrityViolationException` —
`CellarExceptionHandler` does not, and the
[error-handling convention](../../../backend/README.md) deliberately lets broad
exception types fall through to a message-less 500. So the losing request's
whole transaction rolls back: the user clicked "add", got an error, and none
of their bottles were saved.

It is a narrow window — only the first two genuinely-concurrent adds for a
given (user, beer) pair, because once the `entry` row exists every request
takes the `findByUserIdAndBeerId` branch instead. But it is a plausible
double-click, and a 500 on a write that silently loses data is the worst
failure shape the cellar has.

## Scope

Concurrent "add bottle" requests for the same (user, beer) resolve without an
error and with every request's bottles persisted against a single shared
entry. The behaviour a caller sees is unchanged: adding bottles always
succeeds.

## Non-goals

- The concurrent-add path where the entry **already exists** — both
  transactions load it, each appends new `bottle` rows under fresh ids, and
  the derived quantity is computed rather than stored, so no write is lost.
  Refinement confirms this analysis rather than this task changing that path.
- Optimistic locking on `Entry` as a general policy.
- The orphaned-entry question from quality backlog SHOULD-16 (a catalog beer
  disappearing) — unrelated, still in the backlog.

## Constraints

- **Resolution decided with the product owner (2026-09-04, quality backlog
  MUST-8): catch-and-refetch (get-or-create retry).** On the constraint
  violation the operation retries; the retry's `entryFor` now finds the
  winner's entry and appends to it. The chosen mechanism is Spring Retry —
  `@Retryable(maxAttempts = 2)` scoped to `DataIntegrityViolationException`
  on the add path — rather than a hand-rolled two-transaction structure.
- `spring-retry` (and the AOP support it needs) is a **new dependency**: list
  it and confirm the version in refinement
  ([CLAUDE.md](../../../CLAUDE.md) "new dependencies"). It is Spring
  Boot-managed, so the proposal is the BOM version for confirmation, plus
  `@EnableRetry` on a configuration class.
- Each retry attempt must run in its **own** transaction — once
  `DataIntegrityViolationException` fires, the failed transaction is
  rollback-only and cannot be reused. The retry proxy must sit outside the
  `@Transactional` boundary so attempt two starts a fresh transaction.
  Verify this with the concurrency test, not by reading the proxy order.
- Do **not** add an advice mapping `DataIntegrityViolationException` to a
  response — the [`backend/README.md`](../../../backend/README.md)
  error-handling convention forbids mapping broad exception types, and the
  retry removes the need to.
- Whether this earns an ADR (a retry-on-constraint pattern with rejected
  alternatives — 409, DB `ON CONFLICT` upsert — whose reasoning would not
  survive in the code) follows
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md); settle it in
  refinement.

## Open questions

- **Failure handling:** after the fix, is there any remaining path where a
  concurrent add against an *existing* entry loses bottles? State the
  analysis (child `bottle` inserts under distinct ids, computed quantity) and
  have the product owner confirm the scope stays entry-creation only, or
  widen it.
- **Constraints/trade-offs:** Spring Retry is a dependency carried for one
  call site. Confirm that is acceptable versus the dependency-free
  two-transaction get-or-create (a `REQUIRES_NEW` inner method or an
  entry-creation step that commits first).
- **Module boundaries:** does `entryFor`'s get-or-create shape recur anywhere
  planned (profile, feed)? If so the retry belongs somewhere shareable, not
  inline on `addBottles`.
- **Constraints:** ADR or no ADR, and if yes, which subject.

## Acceptance criteria

- [ ] An integration test (`*IT`, two threads/transactions against the
      Testcontainers PostgreSQL) fires two `addBottles` calls for the same
      (user, beer) with no pre-existing entry and asserts: exactly one
      `entry` row, every bottle from both calls persisted, no exception
      surfaced — confirmed to fail (500 and lost bottles) against the
      pre-fix code
- [ ] The same test asserts the losing request returns its bottles with a
      201, not a 500
- [ ] `mvn verify` is green, including `ModularityTest` and `ArchitectureTest`
- [ ] Any new dependency is recorded in
      [`backend/README.md`](../../../backend/README.md)'s tech stack; if
      refinement decides an ADR is earned it is added and
      `node scripts/check-adrs.mjs` stays green

## Notes

Provenance: quality backlog **MUST-8** (confirmed 2026-08-30). The
`[needs decision]` was resolved with the product owner on 2026-09-04 —
catch-and-refetch via Spring Retry, in preference to returning 409 or a
Postgres `ON CONFLICT` upsert.
