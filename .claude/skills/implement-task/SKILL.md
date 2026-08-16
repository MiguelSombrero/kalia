---
name: implement-task
description: Numbered procedure for implementing one refined docs/tasks/iteration-N task, from reading the task file to opening the pull request, with implementing and commenting kept as separate, ordered passes. Entry point for an implementation task — invoke before writing any code for a refined task file.
---

# Implement a task

`CLAUDE.md`'s `## Workflow` already states every gate below; nothing here
changes one. This only orders them, and gives the code-comment pass a step of
its own — a moment to apply
[ADR-0017](../../../docs/adr/0017-code-comment-policy.md)'s test to a comment
before it is written, rather than after, in the same pass as the code.

The default stays [ADR-0027](../../../docs/adr/0027-process-weight.md)'s:
implement directly and run `/code-review`. Invoking this skill is not licence
to reach for `/feature-dev` or subagent-driven execution — those still need
their own condition from that ADR before they apply.

## Procedure

1. Read the task file and confirm its `- **Status:**` is `refined` —
   `CLAUDE.md` "Never start a task that is not `refined`".
2. Branch off up-to-date `dev` — `CLAUDE.md` "Never commit directly to
   `dev`".
3. Implement the change, writing no code comments in this pass (step 5 is
   where comments get added). If it introduces a new dependency, ask which
   version before continuing — `CLAUDE.md` "New dependencies: ask, don't
   research".
4. Write or update tests with the code and get the relevant suites green —
   `CLAUDE.md` "Test-first", verified by actually running the change.
5. Re-read the diff and add only the comments that pass
   `.claude/rules/code-comments.md`'s test, then close the pass by running
   `node scripts/check-comments.mjs`.
6. Doc-sync: re-read the touched sections of `docs/architecture.md`, the task
   file's iteration index, and any ADRs the change touches, and update them
   or record in the pull request that they were checked — `CLAUDE.md`
   "Doc-sync gate".
7. Run `/code-review` on the diff and resolve each finding as fix-now or a
   new task — `CLAUDE.md` "Code-review gate".
8. Check off the task's acceptance criteria and set its status to `done`, in
   the task file and its iteration index. If this was the iteration's last
   task, verify its "Done when" before updating its `Status` in
   `docs/roadmap.md` — `CLAUDE.md`'s roadmap-task bullet and "Iteration DoD
   gate".
9. Push the branch and open the pull request per
   `docs/PULL_REQUEST_TEMPLATE.md` — `CLAUDE.md` "Open the PR automatically".
