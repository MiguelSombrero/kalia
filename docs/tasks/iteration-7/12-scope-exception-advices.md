# Task 12: Scope each module's exception advice to its own module

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

[ADR-0014](../../adr/0014-shared-exception-handling.md) and
[backend/README.md](../../../backend/README.md) describe per-module exception
advices: `catalog` handles catalog's exceptions, `cellar` handles cellar's, and
`fi.kalia.web` holds only what is genuinely module-neutral. **The code does not
do that.** `CatalogExceptionHandler` and `CellarExceptionHandler` are both a
bare `@RestControllerAdvice` with no `basePackages` and no `assignableTypes`,
which registers them for **every controller in the application**. Catalog's
advice is live on cellar's endpoints and on identity's.

No collision exists today, so nothing is broken and nothing fails. What makes
it this iteration's problem is arithmetic: two modules already define
same-named `BeerNotFoundException` types, iteration 6 added a module, and
[task 01](01-feed-module.md) adds `feed` — a third module with its own advice,
registered globally alongside the other two. When two advices can handle the
same exception type, which one wins is decided by `@Order` and, absent that, is
not something anyone should be reasoning about at 2am. The failure mode is a
wrong `problem+json` body on an endpoint in a module that never asked for it —
a passing test suite and a wrong API response.

This is the cheapest it will ever be to fix: one annotation attribute per
advice, before a third is written against the broken pattern.

(Quality backlog SHOULD-13.)

## Scope

Each module's `@RestControllerAdvice` bound to its own module's controllers,
`fi.kalia.web`'s global advice left global, and a test that fails if a future
advice is added unscoped.

## Non-goals

- Changing any problem response's shape, status or `detail`. This is about
  *which* advice answers, not what it says.
- Merging the advices, or moving handlers between them
  ([ADR-0014](../../adr/0014-shared-exception-handling.md) decided that split
  and it is not being reopened).
- `feed`'s own advice — [task 01](01-feed-module.md) and
  [task 02](02-feed-api.md) write it, against whatever this task establishes.

## Constraints

- [ADR-0014](../../adr/0014-shared-exception-handling.md) is the decision being
  *implemented*, not revisited: the ADR already says advices are per-module.
  If the fix turns out to need a different mechanism than the ADR implies, that
  is an amendment rather than a silent divergence.
- **A rule with no failing fixture is not enforced.** The repo already learned
  this: `noClasses()` ArchUnit rules are re-run against
  `backend/src/test/java/archfixture/` because a rule no production class
  violates passes whether or not its condition is right
  ([architecture.md §7](../../architecture.md)). A test asserting "advices are
  scoped" needs to be shown failing against an unscoped one.
- `@RestControllerAdvice`'s scoping attributes are not interchangeable —
  `basePackages` binds by controller package and `assignableTypes` by
  controller class. Which one survives a module's controllers being renamed or
  a second controller being added is the thing to get right; the wrong choice
  silently stops matching rather than erroring.
- The `fi.kalia.web` advice is the sanctioned module-neutral one
  ([architecture.md §3](../../architecture.md)) and must stay
  application-wide — a fix that scopes everything uniformly breaks it.

**Decided 2026-09-12.**

- **`basePackages` is the convention** (question 1, product owner), and
  `feed`'s advice and every later module's follow it without re-deciding. It
  binds by controller package, so a second controller added to a module is
  covered automatically — the routine case. It breaks on a package rename,
  which is a deliberate act visible in the same diff, rather than on the
  routine one. `assignableTypes` fails in the direction nobody notices: a new
  controller silently falls through to another module's advice.
- **Both guards, not a choice between them** (question 2, closed by this task's
  own acceptance criteria rather than by asking): an integration test proving
  one module's advice does not answer on another module's endpoint, *and* a
  build-failing rule that every `@RestControllerAdvice` outside `fi.kalia.web`
  declares a scoping attribute — the second exercised against a violating
  fixture under `backend/src/test/java/archfixture/`, since a rule no
  production class violates passes whether or not its condition is right
  ([architecture.md §7](../../architecture.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] An exception type handled by one module's advice is **not** handled by it
      when thrown from another module's controller — integration test,
      confirmed to fail against the current unscoped advices
- [ ] `fi.kalia.web`'s global advice still answers on every module's endpoints
      — integration test covering at least two modules
- [ ] A new unscoped `@RestControllerAdvice` outside `fi.kalia.web` fails the
      build, and that guard is itself exercised against a violating fixture
      under `backend/src/test/java/archfixture/` rather than only against
      compliant code
- [ ] `backend/README.md`'s exception-handling convention names `basePackages`
      as the scoping attribute a new module's advice must carry
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-13, confirmed
2026-08-30 and re-confirmed 2026-09-12 — both advices are still bare
`@RestControllerAdvice`. Lifted into this iteration because
[task 01](01-feed-module.md) adds the third module the finding predicted.
