# Task 08: CLAUDE.md fits its budget again, and says what is true

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

`CLAUDE.md` is 266 lines against the 200-line budget it states about itself
([ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md)), and that
ADR's revisit trigger has fired. It was 252 after the 2026-09-29 trim, 260 at
the last sweep, and every process PR since added lines; none removed any.
[Iteration 9](../iteration-9.md) must add more: the Expo "check the docs, not
memory" warning and the no-new-costs constraint. The screenshot bullet
(`:131-137`) carries rationale already held by `.claude/rules/no-screenshots.md`
and [ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md) —
the kind ADR-0048 says a bullet may not keep.

A trim of rationale, history and prose took it from 270 to 252 and no
further, so what remains is rules. ADR-0048 names the one option that reaches
200 — moving whole gates (doc-sync, code-review, iteration DoD) into
`implement-task` — and rejected it "for now" as its own decision. The other
live option is an advisory `check-claude-md.mjs`.

Two bullets also say something false:

- **"A decision earns an ADR"** (`:198-201`) states only
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s first test, not
  its 2026-08-08 and 2026-09-04 amendments (the task file or another existing
  home is enough). The product owner has had an over-eager ADR dropped before
  merge twice (#218, #248), and `docs/adr/README.md:10-14` states the test
  CLAUDE.md omits, so the two pointers disagree.
- **"Not adopted"** (`:251`) calls the per-task review "a full four-dimension
  subagent review", but the sweep it is contrasted with dispatches five.

## Scope

`CLAUDE.md` is at or under its budget, with room for iteration 9's two
additions, by moving whole gates into the skill that runs them. The two false
bullets say what is true.

## Constraints

- [ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md): what a bullet
  may hold; a rule whose violation fails silently keeps its warning inline
  (CLAUDE.md "Each documented fact has one home").
- The Next.js "check the docs" warning stays in CLAUDE.md itself, since a
  nested file is not re-injected after `/compact`.
- An accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

**Decided at refinement, 2026-10-24** (product owner):

- **The doc-sync, code-review and iteration-DoD gates move into `implement-task`**, which already orders them, leaving a one-line pointer in CLAUDE.md. An advisory checker and a raised budget were rejected; the budget stays 200.
- **Recorded in a new ADR superseding ADR-0048's "not for now"**, with ADR-0048 marked accordingly.

## Open questions

**None.**

## Acceptance criteria

- [x] `wc -l CLAUDE.md` is at most 200, with room for iteration 9's two
      additions
- [x] The doc-sync, code-review and iteration-DoD gates are stated in full in
      `implement-task`, and CLAUDE.md points at them in one line — `node
      scripts/check-links.mjs` and its test green
- [x] The new ADR supersedes ADR-0048's "not for now", and ADR-0048 says so
- [x] The ADR bullet states every ADR-0032 test, the sweep is called
      five-dimension, and `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-31, SHOULD-60 and
COULD-68. Ahead of iteration 9 because iteration 9 has to add to the file.
