# ADR-0115: An iteration's status is edited only by its opening and closing pull requests, and a large iteration is run by an orchestrator that writes no code

- **Status:** accepted
- **Date:** 2026-11-15

## Context

Iteration 11.5 had twenty-odd refined tasks, and its first wave ran as parallel
sessions, one per task, each in its own worktree. The product owner relayed
between them by hand. A main session then took over the planning, starting
child sessions, checking their pull requests and carrying questions both ways,
and the product owner asked for that to become a procedure.

Two things the first wave showed need a decision, not just a skill.

**Every task session edited the iteration's status.** `implement-task` told the
session that finished an iteration's first `done` task to mark it `🔄 In
progress`, and the one that finished the last to run the definition-of-done
gate and close it. With tasks running in parallel no session can know whether
it is first or last, so each believed it was first: three merged task pull
requests (#637, #638, #640) each rewrote the same roadmap row. The rule worked
for a serial iteration and conflicts in a parallel one.

**A child's "done" was relayed as fact.** Three reports in the same wave were
wrong when read against the pull request: one said "marked done" while its body
said `in-progress`; one stopped waiting on a CI run that had already failed; one
said "implemented" while the criteria that needed a native run were unmet and
the task stayed `refined`. A relay that repeats what a child says moves the
check onto the product owner.

The repository already has the pieces: `make check` fails a done task under a
`⬜ Todo` roadmap row, the heavy-session cap and the worktree rule are in
`CLAUDE.md`, and the checkpoint file survives a session limit
([ADR-0046](0046-edit-time-checks-and-one-verify-gate.md)). What was unwritten
is who edits the status, and what the session that coordinates may and may not
do.

## Decision

**An iteration's status in `docs/roadmap.md` is edited only by two pull
requests of its own — an opening one that marks it `🔄 In progress` and merges
before any task pull request, and a closing one that verifies each `Done when`
criterion by running it and then marks it `✅ Done` — and an iteration large
enough for parallel work is run by an orchestrating session that delegates every
repository change to child sessions and edits nothing itself.**

- **No task pull request edits an iteration's status**, first task or last; the
  `implement-task` rule that said otherwise is replaced. This holds whether or
  not an orchestrator runs the iteration: below the size where one pays, the
  single session working the tasks opens the two pull requests itself.
- **The closing pull request carries no task file and the criteria check is its
  work.** An unmet criterion becomes a proposed task for the product owner,
  never a quiet close, and the orchestrator never declares an iteration done.
- **The orchestrator plans, delegates, relays and verifies.** It starts a task
  when its prerequisites are merged, it overlaps no in-flight task's files and a
  heavy-session slot is free; it re-plans after every merge round; it forwards
  the product owner's words verbatim and invents no approval; it checks a
  child's report against the pull request before repeating it. It opens no
  pull request, edits no tracked file, and never merges.
- **The procedure is the `implement-iteration` skill**, which also states the
  size at which it applies: six or more `refined` tasks, two of them able to
  run at once. It does not change how one task is implemented or reviewed.
- **`make check` no longer fails an iteration with every task done and the row
  still `🔄 In progress`**, because the closing pull request follows the last
  task's. `⬜ Todo` with a task begun, and `✅ Done` before every task is,
  still fail.

**Not decided here:** the gates of a pull request that completes no task — the
opening and closing ones among them — which belong to
[task 23 of iteration 11.5](../tasks/iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md).

## Alternatives considered

**The first done task marks the iteration in progress and the last one runs the
definition-of-done gate** — the rule in force until now. Rejected on the
evidence above: "first" and "last" are facts about other sessions that a task
session cannot see, so parallel tasks collide on one line, and the session that
finished last is also the one that least knows what the others built and has
the most reason to call the iteration done.

**A plain interactive session per task and no orchestrator.** The product owner
runs each session, answers the same question in several of them, and checks
each report. It is the right shape for a small or serial iteration and stays
the default there. Rejected as the way to run a large one because the product
owner becomes the relay: the cost grows with the sessions in flight, and the
verification the three wrong reports needed fell to the person with the least
time for it.

**An orchestrator that also opens the status pull requests, or fixes what a
child got wrong.** Rejected: the session that holds the whole plan then also
holds a diff, races its own checkout against the children's, and checks work it
has just done itself. Its context is the scarce thing here, and the plan is what
a compaction must not lose.

**Subagents instead of sessions.** [ADR-0027](0027-process-weight.md) measured
the subagent-driven mode at about ten times the direct cost, and a subagent's
result returns into one context while the product owner can neither see nor
stop it. A child session is a pull request the product owner can open, steer and
review on its own.

**An orchestrator that merges once checks are green.** Rejected: merging is the
product owner's explicit action (`CLAUDE.md`), and an orchestrator that merges
turns the verification step into the last one rather than a step before the
product owner's.

## Consequences

- Good, because one pull request edits each iteration's status, so parallel task
  pull requests no longer conflict on it and no task session has to guess where
  it stands.
- Good, because the `Done when` check is made by a session started for it, and a
  gap becomes a proposed task rather than being decided by the author of the
  last task.
- Good, because the product owner has one session to follow and one digest: what
  is in flight, what waits, the order to merge.
- Bad, because every iteration pays two extra pull requests, small as they are,
  even a two-task one; a finished task cannot be pushed, or pass `make check`,
  until the opening one merges.
- Bad, because nothing mechanical now forces a close: an iteration whose last
  task is done may sit at `🔄 In progress`. The orchestrator's closing step, and
  the product owner reading the roadmap, are the only prompt.
- Bad, because "the product owner follows only the orchestrator" cannot be
  promised. A permission prompt or an app-level card can still surface in a
  child session, and the orchestrator can verify only what a pull request and
  the repository show, not what happened inside the child.
- Bad, because the orchestrator's plan lives in its context and one gitignored
  file; a stale checkpoint after a session limit is reconciled against the live
  sessions and pull requests, not trusted.
- Neutral, because "six or more tasks, two at once" is a judgment about where an
  extra session starts paying for itself, set from iteration 11.5 alone.
- **Revisit trigger:** an iteration run under this skill closes with more
  relayed questions or wrong reports than the first wave had, or an iteration
  is left `🔄 In progress` after its last task — the second makes a checker the
  next thing to try.

## Evidence

Iteration 11.5, 2026-11-15, from `git log` and the pull requests: #637, #638 and
#640 each changed `docs/roadmap.md` by the same single edit,
`⬜ Todo` → `🔄 In progress`, in a task pull request that was not the only one
open. The three wrong reports are from the orchestrating session's own record of
that wave, not from a repository artifact: no pull request or note names them,
so they are testimony, and the procedure's verification step is what would
catch the next one.

Checked by running it: `node --test scripts/check-tasks.test.mjs` passes with
the relaxed roadmap check, and the case it relaxed (every task done, row still
`🔄 In progress`) is now asserted to pass.
