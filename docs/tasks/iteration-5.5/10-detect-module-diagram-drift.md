# Task 10: Detect backend module-diagram drift in CI

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`docs/architecture.md` §2 and §3 describe the backend module map by hand — a
mermaid flowchart and a dependency table — and nothing detects them drifting
from the actual modules. Spring Modulith's `Documenter` derives both from
the code (a C4 component diagram plus a per-module "canvas" listing
dependencies, exposed types, and events published/consumed), and
`spring-modulith-docs` 2.1.0 is already on the test classpath via
`spring-modulith-starter-test` — no new dependency needed.

This fits the project's core premise that docs and code must not drift, and
gets more valuable as `identity`, `cellar`, `feed` and whatever follows
multiply the edges a human has to keep in sync by hand.

The product owner decided, during the 2026-08-23 quality-backlog triage, on
the approach: keep the hand-written mermaid diagram as the document readers
see, but add a test that runs `Documenter` and fails CI if the generated
output disagrees with it — closing the drift risk without changing how
`docs/architecture.md` reads or requiring a rendering step for readers.

## Scope

A test that runs Spring Modulith's `Documenter` and compares its output
against the committed §2/§3 content in a way that fails when they disagree
about which modules exist or depend on which — together with the CI change
that makes a pull request touching only `docs/architecture.md` actually run
that test.

## Non-goals

- Replacing §2/§3's mermaid diagram and dependency table with `Documenter`'s
  own PlantUML/AsciiDoc output — the product owner explicitly decided
  against this option.
- Any change to the module structure itself.
- Comparing anything §2/§3 do not already state — exposed types, and events
  published or consumed, stay out even though `Documenter` derives them.

## Constraints

- `Documenter` emits PlantUML/AsciiDoc, not mermaid — the test compares the
  *facts* (which modules exist, which depend on which), not the rendered
  diagram syntax, since a bit-for-bit format comparison isn't meaningful
  here.
- **The expected side is `docs/architecture.md` itself, parsed at test
  time**: §2's mermaid block for the module set, §3's table for the module
  set and its `Depends on` column. No generated snapshot is committed — a
  second copy would only detect code-versus-snapshot drift and leave the
  document readers actually see free to drift on its own. The accepted cost
  is that the test is coupled to §2/§3's markdown formatting.
- **The comparison covers modules and inter-module dependency edges, and
  fails in both directions**: an edge the code has that §3 does not list, and
  an edge §3 lists that no code creates.
- **`fi.kalia.web` is excluded from the comparison**, as the module-neutral
  exception [ADR-0014](../../adr/0014-shared-exception-handling.md)
  sanctions: Spring Modulith sees it as a fourth application module, while
  §2/§3 deliberately describe it in prose rather than as a subdomain. The
  exclusion names that reason where it is written; §2 and §3 are not
  reshaped to accommodate it.
- **A parse that finds no §2 mermaid block, or no §3 table, fails the test.**
  Treating "nothing found" as "nothing to compare" would turn a renamed
  heading or a reformatted table into a silent pass — the exact failure mode
  this task exists to prevent.
- **It is a `*Test`, not an `*IT`**: `Documenter` boots no Spring context and
  needs no Testcontainer, which is what
  [backend/README.md](../../../backend/README.md)'s naming convention keys
  on. It therefore runs in `mvn test` and `mvn verify`, locally and in CI
  alike — the repo has no CI-only test mechanism for the alternative to mean
  anything.
- **`docs/architecture.md` joins the `shared` list in the changed-area filter
  of `.github/workflows/ci.yml`.** That filter classifies nothing under
  `docs/`, so today a pull request editing only §2/§3 skips the backend job
  entirely — the test would never see the change most likely to introduce
  drift.
- **No ADR** ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)):
  the reason survives in `backend/README.md`'s "Notable suites" list, beside
  `ModularityTest` and `ArchitectureTest`, which is where a fact of this
  shape lives ([ADR-0020](../../adr/0020-documentation-roles.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] A `*Test` runs Spring Modulith's `Documenter` and fails when the
      modules or dependencies it finds disagree with `docs/architecture.md`
      §2/§3 — confirmed to fail by temporarily adding a module dependency
      `catalog` doesn't have and not updating the docs
- [ ] The same test fails in the opposite direction — confirmed by
      temporarily adding an edge to §3's `Depends on` column that no code
      creates
- [ ] The test fails rather than passing vacuously when §2's mermaid block or
      §3's table cannot be found — confirmed by temporarily renaming §3's
      heading
- [ ] A pull request touching only `docs/architecture.md` runs the backend
      job — confirmed by running the "Detect changed areas" step's script
      against a changed-file list containing that path alone and reading
      `backend=true`
- [ ] `mvn clean verify` is green with the docs and code in their current,
      agreeing state

## Notes

Quality backlog: COULD-10. `[needs decision]` resolved by the product owner
during the 2026-08-23 quality-backlog triage: generate-and-assert in a test,
keeping mermaid as the document readers see.

Refined with the product owner on 2026-08-25. Six decisions came out of that
conversation and are recorded as Constraints above: parse §2/§3 directly
rather than commit a generated snapshot; compare modules and edges only;
allow-list `fi.kalia.web` rather than give it a table row; extend CI's
changed-area filter to `docs/architecture.md`; a `*Test` rather than an
`*IT`; and no ADR, the README carrying the reason instead.
