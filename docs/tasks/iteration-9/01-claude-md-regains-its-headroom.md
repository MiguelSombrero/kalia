# Task 01: CLAUDE.md has room for what mobile adds to it

- **Status:** needs-refinement
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

## Open questions

1. **Which rules move, and where to?** Candidates that already have a home
   which enforces them: the parallel-worktree bullet (the `worktree` skill),
   the CVE-scan bullet (`implement-task` or a rule file), the new-dependencies
   bullet, the two failure-log bullets (`common-failures.md`,
   `ci-playbook.md`). Each has to be judged against "does a session need this
   before it reaches the skill?".
2. **How much headroom is enough?** Task 07's two additions, plus whatever
   `mobile/CLAUDE.md` cannot carry because nested files are not re-injected
   after `/compact`. A target line count, rather than "under 200", keeps this
   from needing a third pass in iteration 10.
3. **Does the move need ADR-0048 amended again**, or is its 2026-10-24
   amendment ("whole gates move into the skill that runs them") already the
   general rule this applies?
4. **Should the budget be checked mechanically?** Today nothing fails when
   the file passes 200; 8.5 task 08 rejected an advisory checker, and the
   question is whether a hard one is different.

## Acceptance criteria

- [ ] `wc -l CLAUDE.md` is at or under the target agreed at refinement
- [ ] Every moved rule is stated in full at its new home, and `CLAUDE.md`
      points at it in one line — `node scripts/check-links.mjs` and its test
      green
- [ ] No rule whose violation fails silently has lost its inline warning
- [ ] `make verify-fast` is green

## Notes

Provenance: carried over from [iteration 8.5](../iteration-8.5.md), which
closed with the file at 199 of 200 lines. First in the iteration because task
07 depends on it.
