# Task 14: Every boundary guard catches what the docs say it catches

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

Kalia documents its module boundaries as *enforced*. Each finding below is a
guard that passes while the boundary or the document it protects is wrong,
which is worse than having no guard, because the passing guard is what makes a
reviewer stop looking.

**The architecture diagram's edges are wrong, and its test cannot see
edges.** `docs/architecture.md` §2 (lines 58-75) routes every backend call
Browser → UI → `RH[Route handlers /api/*]` → API. But the only route handlers
are the two auth ones (§5); backend calls go from server components and Server
Actions. It draws no `API --> FED` edge, though `/api/v1/feed` exists. It also
draws only one (`FED --> CEL`) of the seven inter-module edges that §3's table
lists. `ArchitectureDocumentationTest.java:119-142` parses §2's node set,
never its edges, so it passes. This is the same class of drift as retired
MUST-1.

**A module root may reach straight into `domain`, and the rule says it
cannot.** `moduleRootReachesDomainThroughApplication`
(`ArchitectureTest.java:205-213`) only requires that a root class touching
`domain` *also* touches `application`. A root API injecting both
`CatalogService` and `BeerRepository` therefore passes, which is exactly the
case `docs/architecture.md:116-118` and
[ADR-0007](../../adr/0007-backend-package-structure.md) say is enforced. Its
fixture, `ModuleRootReachingIntoDomain.java`, covers only the case with no
application dependency at all.

**The frontend's import-boundary rules have no violating fixture.**
`docs/architecture.md:388-391` presents them as the counterpart of Modulith
verification, but nothing proves they fire, so a rule that has quietly become
a no-op goes unnoticed. Iteration 9's workspaces change rewrites their
element patterns, which is when that is most likely to happen.

**`docs/` never mentions the test that guards the diagram.** §7's testing
table (lines 667-681) omits `ArchitectureDocumentationTest`, so someone
editing §3's table gets no warning from `docs/` that a test will fail.
`backend/README.md:153-158` documents it.

(Quality backlog MUST-11, SHOULD-42, SHOULD-48 and SHOULD-19.)

## Scope

The diagram shows how calls actually flow and every inter-module edge, and
its test fails when an edge disagrees with Spring Modulith's view. The
module-root rule rejects a root class that reaches `domain` directly, even
alongside `application`. Each frontend boundary rule has a violating fixture
that proves it fires. §7 lists the documentation test.

## Non-goals

- `HttpBoundaryTest` not seeing `@ExceptionHandler` methods — quality backlog
  SHOULD-30, still `[needs decision]`.
- Changing which frontend imports are allowed. `features/cellar`'s catalog
  import is resolved by [task 10](10-cellar-reads-joined-in-the-backend.md);
  this task proves the existing rules fire, not what they permit.

## Constraints

- A rule's fixture lives in `archfixture` and is run by
  `ArchitectureRulesRejectViolationsTest`, following the existing pattern
  (iteration-4 task 6).
- The diagram stays hand-written mermaid, generate-and-assert, as decided for
  retired COULD-10 (iteration-5.5 task 10).
- `docs/architecture.md` §2/§3 must keep agreeing with `ModularityTest`'s view
  of the modules.

**Decided at refinement, 2026-10-15** (product owner):

- **One "Next.js server" node replaces `RH`.** Server components and Server
  Actions run in one process behind one trust boundary, so the test expects
  that node's edges.
- **Each frontend rule is proven by linting committed fixture files** through
  ESLint's Node API in a vitest test, with each expected to produce a
  specific error. That mirrors `archfixture`, and tests the real
  configuration rather than a copy of a rule. `RuleTester` was rejected.

## Open questions

**None.**

## Acceptance criteria

- [x] Removing or adding an inter-module edge in §2's diagram so that it
      disagrees with Modulith fails `ArchitectureDocumentationTest` — confirmed
      by editing the diagram on a scratch branch
- [x] §2's diagram has no route-handler hop for backend calls, draws backend
      calls from one Next.js server node, and draws every inter-module edge §3
      lists, including `API --> FED`
- [x] A module-root class injecting both an application service and a domain
      repository fails `ArchitectureRulesRejectViolationsTest` — new fixture,
      confirmed to pass against today's rule and fail against the tightened
      one
- [x] Each frontend boundary rule in `eslint.config.mjs` has a committed
      violating fixture, linted through ESLint's Node API in a vitest test
      that expects the rule's error
- [x] §7's testing table lists `ArchitectureDocumentationTest`
- [x] `mvn clean verify` and `npm test` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-11, SHOULD-42,
SHOULD-48 and SHOULD-19, all confirmed 2026-10-14. Merged because each is a
guard of a documented boundary that does not catch what it is documented to
catch, and the fix in each case is a fixture or assertion of the same kind.
