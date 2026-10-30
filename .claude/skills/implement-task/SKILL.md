---
name: implement-task
description: Numbered procedure for implementing one refined docs/tasks/iteration-N task, from reading the task file to opening the pull request, with implementing and commenting kept as separate, ordered passes. Entry point for an implementation task — invoke before writing any code for a refined task file.
---

# Implement a task

`CLAUDE.md`'s `## Workflow` states most gates below. Three it leaves to this
skill, which states them in full — doc-sync (step 7), code review (step 8) and
the iteration definition of done (step 11)
([ADR-0048](../../../docs/adr/0048-what-survives-a-claude-md-bullet.md)).
Nothing here changes a gate; this orders them, and gives the code-comment pass
a step of its own — a moment to apply
[ADR-0017](../../../docs/adr/0017-code-comment-policy.md)'s test to a comment
before it is written, rather than after, in the same pass as the code.

`/code-review` and the local gate are ordered review-then-verify, so the gate
runs once on a diff that review and doc-sync have both finished with, not
once before review and again after.

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
6. `git diff | grep -E "^\+.*(//|\*)"` to find every comment line the diff
   has added so far, including ones written inline during step 4 despite its
   instruction not to — that instruction is a target, not a guarantee, so
   this step re-checks rather than assumes it held. Name the fact each one
   carries against `.claude/rules/code-comments.md`'s test; delete or trim
   whatever can't name one.
7. **Doc-sync gate.** Before opening the pull request, re-read the sections of
   `docs/architecture.md`, the iteration index and any ADRs the change
   touches, and update them in the same PR — or state in the description that
   they were checked and remain accurate. The task file is the exception: it
   records what was *asked for*, so it is frozen at completion apart from its
   status and a dead link, which is repointed or unlinked
   ([ADR-0026](../../../docs/adr/0026-task-file-format.md)).
8. **Code-review gate.** Run `/code-review` on the diff — local, in-session,
   no separate service — and mark each finding worth acting on **fix now** or
   **new task**. This runs *before* the local
   gate below, not after: `/code-review`, the comment pass and doc-sync can
   each still change the diff, so running the gate once on the finished diff
   beats running it, reviewing, then running it again. Step 5's relevant
   suites are already green, which
   is what makes the review worth doing at this point.
9. Run `make verify-fast` and get it green. It is the local gate: the subset
   that needs neither Docker nor a build, and what the installed `pre-push`
   hook runs. The Docker-backed checks are the required CI checks
   (`ci-passed` and the vulnerability scan), which block the merge when red;
   `make verify` is the same list locally, worth running when the change
   touches the stack (each worktree has its own host ports, so it can run
   beside another's), but it is not required first
   ([ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
   Never push expecting CI to be the first thing that tells you a
   `verify-fast` check is red. Redirect its output to a file and read that —
   piping a long `make`/`mvn`/`npm` run to `tail` or `head` reports the
   *pager's* exit code, not the command's, and scrolls the failing line out
   of view.
10. **Run the change against a running stack and watch it work.** `make
   verify` proves the suites pass, which is a different claim: a Server
   Action that 404s after a re-export refactor, a quantity field cleared on
   submit, a mock path that no longer matches the module it stands for — each
   of those passes its unit tests and reads correctly in a diff. Bring the
   stack up (`make up`), exercise the flow this task actually changed —
   signing in as the seeded dev account where the flow needs it — and report
   **what you saw**, not what you expected to see. A backend-only change is
   exercised against the endpoint; a UI change is exercised in a browser —
   the desktop app's browser pane or Claude in Chrome — and recorded in the
   pull request's Gates section as what you saw, in words. Never commit,
   push or upload a screenshot of it (`CLAUDE.md`, `.claude/rules/no-screenshots.md`).
   "Nothing user-facing changed" is a verdict and a fine answer; silence is
   not.
11. Go through the acceptance criteria one at a time and **run what each one
    says verifies it**, rather than ticking the list from memory of having
    done the work. A criterion states its own check — that is what
    [ADR-0026](../../../docs/adr/0026-task-file-format.md) requires of it, and
    why at least one is an automated test. Tick a box only after seeing that
    check pass; if it fails, fix it and run it again. A criterion you cannot
    honestly tick means the task is not done, not that the box is optimistic.
    Only then set the task file's status to `done`
    (`scripts/sync-indexes.mjs` copies it into the iteration index).
    Iterations 0–4 predate task files: tick in `docs/tasks/iteration-N.md`.

    **Iteration DoD gate**, when this was the iteration's last task. Never
    declare an iteration complete because its last task is ticked. Re-read its
    "Done when" and verify each criterion by running it; if any is unmet, add
    tasks to close the gap. The same coverage check applies when planning an
    iteration ([ADR-0026](../../../docs/adr/0026-task-file-format.md)). Once it
    is genuinely done, update every document that states the iteration's
    status, in the same pull request: its `Status` in `docs/roadmap.md`; the
    status blockquote and the "What Kalia does" feature list in `README.md`;
    and `docs/architecture.md` §1's "Built:" list and its "No iteration is in
    progress. The next is …" line. Missing the last three is how the close of
    5.5, 6 and 7 drifted.
12. Push the branch and open the pull request per
    `docs/PULL_REQUEST_TEMPLATE.md` — `CLAUDE.md` "Open the PR automatically".

## Gates

Before opening the pull request, print `git log --oneline origin/dev..HEAD`;
it goes in the report below. It is what makes the review range checkable
rather than assumed — a `/code-review` bound to a different worktree reviews a
different diff and still reports cleanly, which is the failure
[ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)
records.

Then state, in the pull request's **Gates** section
(`docs/PULL_REQUEST_TEMPLATE.md`; a report left in the session's final
message is gone when the session ends), which of these ran and which did not,
naming a reason for each one skipped (in procedure order):

- doc-sync
- `/code-review`
- `make verify-fast` (or `make verify`, said explicitly), and the required
  CI checks green once the pull request is open
- the change exercised against a running stack, with what was observed
- each acceptance criterion re-verified by running its own check, then
  ticked, and the status set to `done`
- iteration "Done when" re-verified, where this was the last task

A gate with no verdict counts as skipped. "All gates passed" without the two
printed lines above is an assertion, not a report.

## A red check

Three rules for a check that goes red, moved here whole from `CLAUDE.md`,
which now points at this section
([ADR-0048](../../../docs/adr/0048-what-survives-a-claude-md-bullet.md)):

- **A CI vulnerability-scan failure unrelated to your diff is still your
  problem** — fix it in place as its own commit on the open branch, never a
  second PR ([ADR-0024](../../../docs/adr/0024-dependency-vulnerability-scanning.md)).
  No asking first *only* while the fix stays inside the vulnerable package's
  declared semver range (a lockfile-only bump); crossing it, or bumping a
  *direct* dependency past its pin, is a version choice under `CLAUDE.md`'s
  "New dependencies". Confirm the finding clears with `make trivy-scan` (CI's
  flags, manifests only; an image finding is
  [`backend/README.md`](../../../backend/README.md)) before pushing.
- **An unexpected failure gets one appended row in
  [docs/common-failures.md](../../../docs/common-failures.md)**, on the branch
  it happened on
  ([ADR-0084](../../../docs/adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
- **A CI check you have seen fail before is probably in
  [docs/ci-playbook.md](../../../docs/ci-playbook.md)**; add an entry when a
  failure costs real time to *recognise*, naming the run.
