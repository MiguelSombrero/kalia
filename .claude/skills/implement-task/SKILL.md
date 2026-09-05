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

`/code-review` and `make verify` are ordered review-then-verify, so the slow
gate runs once on a diff that review and doc-sync have both finished with,
not once before review and again after.

The default stays [ADR-0027](../../../docs/adr/0027-process-weight.md)'s:
implement directly and run `/code-review`. Invoking this skill is not licence
to reach for `/feature-dev` or subagent-driven execution — those still need
their own condition from that ADR before they apply.

## Procedure

1. Read the task file and confirm its `- **Status:**` is `refined` —
   `CLAUDE.md` "Never start a task that is not `refined`".
2. Branch off up-to-date `dev` — `CLAUDE.md` "Never commit directly to
   `dev`". If the task gets its own checkout, the `worktree` skill is the
   procedure for cutting one that is not already behind.
3. Write `.claude/session-checkpoint.md` before any long or fanned-out work:
   worktree path, branch, base ref, task file, the ordered steps with
   done/pending status, and — if agents are being dispatched — the exact
   scope handed to each. Update it as steps complete. It is gitignored, and
   it is the only thing that survives a session-limit interruption, so on
   "resume where you left off" it is the first thing to read rather than
   re-exploring ([ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
4. Implement the change, writing no code comments in this pass (step 6 is
   where comments get added). If it introduces a new dependency, ask which
   version before continuing — `CLAUDE.md` "New dependencies: ask, don't
   research".
5. Write or update tests with the code and get the relevant suites green —
   `CLAUDE.md` "Test-first", verified by actually running the change.
6. Re-read the diff and add only the comments that pass
   `.claude/rules/code-comments.md`'s test.
7. Doc-sync: re-read the touched sections of `docs/architecture.md`, the task
   file's iteration index, and any ADRs the change touches, and update them
   or record in the pull request that they were checked — `CLAUDE.md`
   "Doc-sync gate".
8. Run `/code-review` on the diff and resolve each finding as fix-now or a
   new task — `CLAUDE.md` "Code-review gate". This runs *before* the full
   `make verify` below, not after: `/code-review`, the comment pass and
   doc-sync can each still change the diff, and `make verify` is the slow
   gate — running it once on the finished diff beats running it, reviewing,
   then running it again. Step 5's relevant suites are already green, which
   is what makes the review worth doing at this point.
9. Run `make verify` and get it green. It is the whole check list CI runs, in
   CI's order; `make verify-fast` is the subset that needs neither Docker nor
   a build, and is what the installed `pre-push` hook runs. Never push
   expecting CI to be the first thing that tells you a check is red. Redirect
   its output to a file and read that — piping a long `make`/`mvn`/`npm` run
   to `tail` or `head` reports the *pager's* exit code, not the command's,
   and scrolls the failing line out of view.
10. **Run the change against a running stack and watch it work.** `make
   verify` proves the suites pass, which is a different claim: a Server
   Action that 404s after a re-export refactor, a quantity field cleared on
   submit, a mock path that no longer matches the module it stands for — each
   of those passes its unit tests and reads correctly in a diff. Bring the
   stack up (`make up`), exercise the flow this task actually changed —
   signing in as the seeded dev account where the flow needs it — and report
   **what you saw**, not what you expected to see. A backend-only change is
   exercised against the endpoint; a UI change is exercised in a browser,
   which `docs/PULL_REQUEST_TEMPLATE.md` already requires as its own
   test-plan line. "Nothing user-facing changed" is a verdict and a fine
   answer; silence is not.
11. Go through the acceptance criteria one at a time and **run what each one
    says verifies it**, rather than ticking the list from memory of having
    done the work. A criterion states its own check — that is what
    [ADR-0026](../../../docs/adr/0026-task-file-format.md) requires of it, and
    why at least one is an automated test. Tick a box only after seeing that
    check pass; if it fails, fix it and run it again. A criterion you cannot
    honestly tick means the task is not done, not that the box is optimistic
    — `CLAUDE.md`'s roadmap-task bullet. Only then set the status to `done`,
    in the task file and its iteration index; and if this was the iteration's
    last task, verify its "Done when" the same way — by running each
    criterion — before updating that iteration's `Status` in
    `docs/roadmap.md`, per "Iteration DoD gate".
12. Push the branch and open the pull request per
    `docs/PULL_REQUEST_TEMPLATE.md` — `CLAUDE.md` "Open the PR automatically".

## Gates

Before opening the pull request, print `pwd` and
`git log --oneline origin/dev..HEAD`. Both go in the report below. They are
what makes the review range checkable rather than assumed — a `/code-review`
bound to a different worktree reviews a different diff and still reports
cleanly, which is the failure
[ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)
records.

Then state, in the pull request or the final message, which of these ran and
which did not, naming a reason for each one skipped (in procedure order):

- doc-sync
- `/code-review`
- `make verify` (or `make verify-fast`, said explicitly)
- the change exercised against a running stack, with what was observed
- each acceptance criterion re-verified by running its own check, then
  ticked, and the status set to `done`
- iteration "Done when" re-verified, where this was the last task

A gate with no verdict counts as skipped. "All gates passed" without the two
printed lines above is an assertion, not a report.
