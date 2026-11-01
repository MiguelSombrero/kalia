# Task 20: The process's own rules and records match how work is done

- **Status:** done
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Five process findings describe a rule nobody can follow or a setting nobody
knows about:

- **Worktrees are never removed.** The `worktree` skill's steps 2 and 3 do not
  run: eight worktrees with merged or detached work remained, and Gates `pwd`
  lines show sessions reusing old worktrees (#434/#445, #447/#450,
  #448/#451, #435/#452). The fix for COULD-56 in PR #434 did not take,
  because the desktop app creates a worktree per session (SHOULD-91).
- **A PR line nobody can fill.** The "required CI checks" clause of the PR
  template's Local gate line cannot hold a verdict when the body is written:
  eight of nine task PRs recorded it as pending, and the ruleset enforces the
  checks anyway (COULD-90).
- **PRs that only tick boxes.** Three PRs in iteration 8.5 existed only to
  tick criteria checkable after merge (#414, #431, #446) (COULD-91). This
  iteration has several criteria of that shape — a re-sign after seven days,
  ten consecutive green runs.
- **`CLAUDE.md` at its limit.** It is at 199 of
  [ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md)'s 200 lines,
  and ADR-0048 says a third overrun reopens the checker question (COULD-93).
- **A Copilot review that never runs.** Ruleset 19027809 requests a Copilot
  code review on push, but none appears on any of the 23 agent PRs in
  #394–#459, and no doc mentions the setting (COULD-94).

## Scope

The worktree routine works with how sessions actually create worktrees, the PR
template asks only for what can be known when it is written, a criterion
checkable only after merge has a decided home, the `CLAUDE.md` budget question
is answered, and the Copilot rule is either working or gone.

## Constraints

- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): the
  required CI checks are the Docker gate; `scripts/check-pr-body.mjs` checks
  the template's shape.
- ADR-0048: `CLAUDE.md`'s budget and what a bullet may hold.
- [ADR-0026](../../adr/0026-task-file-format.md) and
  [ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md): what a task
  file's criteria are and when they are agreed.
- Changing the branch ruleset is a settings change only the product owner
  makes.
- This task's answer to COULD-91 shapes how this iteration's own criteria are
  worded, so it is settled at this iteration's refinement even though the
  task runs later.

**Decided at refinement, 2026-11-01** (product owner):

- **SHOULD-91: a script removes worktrees whose branch is merged and whose
  tree is clean,** run by a `SessionStart` hook so it runs however the session
  was created. It never removes a worktree with uncommitted changes or one
  another session is using, and the `worktree` skill points at it.
- **COULD-91: every acceptance criterion must be checkable before merge.**
  Refinement rewords one that is not; the rule goes into the task template
  and the `refine-task` and `refine-iteration` skills. This iteration's own
  criteria were worded to it at refinement
  ([iteration index](../iteration-10.md#refinement)).
- **COULD-93: wait for the overrun.** `CLAUDE.md` is at 197 of 200 lines; the
  checker question reopens on ADR-0048's third overrun, and the quality
  backlog records the finding as closed on that reason.
- **COULD-94: the Copilot rule is removed** from ruleset 19027809 by the
  product owner; `/code-review` remains the review gate.
- **COULD-90:** the required-checks clause leaves the PR template and
  `implement-task`'s Gates list.

## Open questions

**None.**

## Acceptance criteria

- [x] A session started after a task's PR merged removes that task's clean
      worktree, shown by `git worktree list`, and a test of the script covers
      a dirty worktree and an unmerged branch being kept
- [x] The PR template and `implement-task` no longer ask for the required
      checks' verdict, and `scripts/check-pr-body.mjs`'s tests pass against
      the new template
- [x] The before-merge rule for criteria is in `docs/tasks/template.md` and
      the `refine-task` and `refine-iteration` skills
- [x] The quality backlog closes COULD-93 as waiting for ADR-0048's third
      overrun, and the PR records the product owner's removal of the Copilot
      rule
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-91, COULD-91,
COULD-93 and COULD-94, all `[needs decision]` (open questions 1–4), and
COULD-90.
