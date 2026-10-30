# Task 01: CLAUDE.md has room for what mobile adds to it

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

[Iteration 8.5 task 08](../iteration-8.5/08-claude-md-within-its-budget.md)
brought `CLAUDE.md` back under its 200-line budget
([ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md)), but the
iteration closed with the file at 199 lines. [Task 07](07-process-carries-a-third-codebase.md)
has to add two rules that must live in the file itself rather than behind a
pointer: the Expo "check the docs, not memory" warning, which has to survive
`/compact` exactly as the Next.js one does, and the constraint that the mobile
plan adds no cost and puts no payment card on file anywhere
([roadmap](../../roadmap.md)). Neither fits in one line.

8.5 task 08 already took the prose trim as far as it goes; what is left is
rules. The only lever that reaches the budget again is the one that worked
there: moving a rule whole into the skill or rule file that already enforces it,
leaving a one-line pointer.

## Scope

`CLAUDE.md` is far enough under 200 lines that task 07's two additions fit
without another trim, because one or more whole rules have moved into the
skill or rule file that already runs them. Nothing a session needs on every
edit, and nothing whose violation fails silently, leaves the file.

## Non-goals

- Adding the Expo warning and the no-new-costs constraint — that is
  [task 07](07-process-carries-a-third-codebase.md), which needs to know what
  `mobile/` looks like before it words the warning.
- Raising the budget. ADR-0048 keeps it at 200 unless amended, and that would
  be its own decision.

## Constraints

- [ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md): what a bullet
  may hold, and its 2026-10-24 amendment moving whole gates into
  `implement-task`.
- A rule whose violation fails silently keeps its warning inline wherever an
  editor meets it (`CLAUDE.md` "Each documented fact has one home") — such a
  rule cannot move behind a pointer.
- The "Quality checks" section's product-owner-only rule cannot move into
  `/quality-sweep`, which sets `disable-model-invocation` and so is never
  loaded by an agent.
- An accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

**Decided at refinement, 2026-10-30** (product owner):

- **Two rules move: the CVE-scan bullet into `implement-task`, and the
  failure-log pair (`docs/common-failures.md`, `docs/ci-playbook.md`) into
  `implement-task` and the `worktree` skill,** where a red check is met.
  The new-dependencies bullet and the ADR-earning test stay: a session
  applies each while advising or deciding, before it has reached any skill.
  The parallel-worktree bullet stays because a shared checkout fails
  silently.
- **The target is at most 187 lines** — what those two moves free at 199
  lines (14 lines out, a one-line pointer each back in), and room for task
  07's two rules with a margin. 185 was proposed first; reaching it would
  have meant moving a third rule, which nothing here needs.
- **ADR-0048 is not amended again.** Its 2026-10-24 amendment, moving a
  whole gate into the skill that runs it, is already the general rule this
  applies.
- **The budget gets no mechanical check.** It stays a review matter, as
  8.5 task 08 left it.

## Open questions

**None.**

## Acceptance criteria

- [x] `wc -l CLAUDE.md` is at most 187
- [x] Every moved rule is stated in full at its new home, and `CLAUDE.md`
      points at it in one line — `node scripts/check-links.mjs` and its test
      green
- [x] No rule whose violation fails silently has lost its inline warning
- [x] `make verify-fast` is green

## Notes

Provenance: carried over from [iteration 8.5](../iteration-8.5.md), which
closed with the file at 199 of 200 lines. First in the iteration because task
07 depends on it.
