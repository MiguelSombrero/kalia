---
name: refine-task
description: Numbered procedure for taking one needs-refinement docs/tasks/iteration-N task file to refined, from sweeping the fixed ambiguity taxonomy to opening the refinement pull request. Entry point for a refinement conversation — invoke before answering a task's open questions or touching its Status.
---

# Refine a task

`CLAUDE.md`'s `## Workflow` and
[ADR-0026](../../../docs/adr/0026-task-file-format.md) already state every
gate below; nothing here changes one. This only orders them, the same way
`implement-task` orders the implementation gates.

This is the procedure for **one** task. When more than one task in an
iteration needs refining, `refine-iteration` is the entry point instead —
refinement's unit is the iteration
([ADR-0047](../../../docs/adr/0047-refinement-is-batched-per-iteration.md)),
and it delegates the per-task mechanics below rather than replacing them.
Step 6 is the seam: an answer that reaches a dependent task already drags that
task into this pull request.

Refining is not implementing: this procedure never touches production code,
never runs on the implementation branch, and ends in its own pull request —
CLAUDE.md "Refine in one PR, implement in another".

## Procedure

1. Read the task file and confirm its `- **Status:**` is `needs-refinement`
   — a task already `refined` doesn't need this pass, and one that's
   `in-progress` or `done` is past it.
2. Read `Why`, `Scope`, `Non-goals` and `Constraints`, and everything they
   link to (ADRs, the relevant `docs/architecture.md` sections). The
   refinement conversation is about what's still undecided, not a rehash of
   what the task file already settles.
3. Sweep the fixed ambiguity taxonomy from
   [template.md](../../../docs/tasks/template.md)'s "Open questions" section
   — functional scope, domain/data model, interaction/UX/wording,
   non-functional attributes, integrations, edge cases, constraints/
   trade-offs, terminology, completion signals, module boundaries — and list
   a question only where sweeping a category actually surfaces one.
4. Hold the conversation with the product owner: present the open questions
   and get answers. No code changes happen in this pass or while the
   conversation is open — `CLAUDE.md` "Code review is a dialogue" states the
   same discipline for review comments, and it applies here too.
5. Record answers as `Constraints` — decisions that now bind the task — and
   resolve `Open questions` to `**None.**` only once every category from
   step 3 has actually been swept. Never write `**None.**` as a default.
6. If an answer changes the `Scope` or `Open questions` of a dependent task
   that isn't refined yet, update that task file too, in the same PR —
   ADR-0026's own example of this (iteration 8 task 01 rewriting tasks 02
   and 03 before either is refined).
7. Branch off up-to-date `dev`, separate from any implementation branch for
   this task — `CLAUDE.md` "Refine in one PR, implement in another": this PR
   carries only the task-file edit(s), no code.
8. Set `Status` to `refined` and run `node scripts/check-tasks.mjs` to
   confirm the file is structurally valid and `Open questions` reads
   `**None.**`.
9. Push the branch and open the pull request per
   `docs/PULL_REQUEST_TEMPLATE.md`. The product owner's merge is the visible
   approval that grants the `refined` gate — the same reasoning
   [ADR-0026](../../../docs/adr/0026-task-file-format.md) gives for why the
   status transition happens in a diff.
