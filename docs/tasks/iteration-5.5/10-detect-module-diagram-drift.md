# Task 10: Detect backend module-diagram drift in CI

- **Status:** needs-refinement
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
about which modules exist or depend on which.

## Non-goals

- Replacing §2/§3's mermaid diagram and dependency table with `Documenter`'s
  own PlantUML/AsciiDoc output — the product owner explicitly decided
  against this option.
- Any change to the module structure itself.

## Constraints

- `Documenter` emits PlantUML/AsciiDoc, not mermaid — the test compares the
  *facts* (which modules exist, which depend on which), not the rendered
  diagram syntax, since a bit-for-bit format comparison isn't meaningful
  here.

## Open questions

- **Constraints and trade-offs:** is `Documenter`'s output committed to the
  repo (so a diff is human-reviewable when the test fails) or generated
  on-demand at test time and discarded? Committing gives a reviewable trail;
  generating fresh avoids a second copy to keep in sync with itself.
- **Constraints and trade-offs:** does this test run as part of
  `mvn verify` (so every local run and PR catches drift immediately) or only
  in CI (faster local `mvn verify`, slower feedback)?

## Acceptance criteria

- [ ] A test runs Spring Modulith's `Documenter` and fails when the modules
      or dependencies it finds disagree with `docs/architecture.md` §2/§3 —
      confirmed to fail by temporarily adding a module dependency `catalog`
      doesn't have and not updating the docs
- [ ] `mvn clean verify` is green with the docs and code in their current,
      agreeing state

## Notes

Quality backlog: COULD-10. `[needs decision]` resolved by the product owner
during the 2026-08-23 quality-backlog triage: generate-and-assert in a test,
keeping mermaid as the document readers see.
