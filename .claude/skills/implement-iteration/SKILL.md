---
name: implement-iteration
description: Numbered procedure for an orchestrating session that implements a whole refined iteration by delegating every task to a child session, relaying between them and the product owner, verifying each report, and opening the iteration's opening and closing pull requests. Entry point when an iteration has six or more refined tasks and two can run at once — invoke before starting the first child session.
---

# Implement an iteration

`implement-task` is the procedure for one task and every rule in it still
binds each child session. This one changes the **unit** from one task to one
iteration, for the reason
[ADR-0115](../../../docs/adr/0115-an-iterations-status-is-edited-only-by-its-opening-and-closing-pull-requests-and-a-large-iteration-is-run-by-an-orchestrator-that-writes-no-code.md)
records. The session using it is the **orchestrator**: it plans, delegates,
relays and verifies, and the product owner (PO) follows only that session.
Everything that touches the repository happens in a child session, because a
session that holds the whole plan in context and also holds a diff is the one
whose context fills first.

## When it applies

Process weight follows [ADR-0027](../../../docs/adr/0027-process-weight.md):
this skill is for an iteration where it pays, and it does not change how any
one task is implemented.

- **Six or more `refined` tasks, and at least two that can run at once.** Below
  that, one session works the tasks one at a time under `implement-task`. It
  is not an orchestrator: it opens the opening and closing pull requests
  itself, to the same content as steps 4 and 11, and none of the rest applies.
- **A `design` task** (`design-task`) is not delegated: it needs the PO's own
  visual choices, so the PO works in that session directly. The orchestrator
  plans around it and records the ADR it produces as a prerequisite.
- **Never start a task that is not `refined`**, and only the PO moves one there
  (`CLAUDE.md`). Tasks still at `needs-refinement` go to `refine-iteration`
  first.

## Rules that do not bend

- **The orchestrator opens no pull request and edits no tracked file.** Its
  exceptions are its own checkpoint (step 3, gitignored) and read-only `gh` and
  `git`, plus `git fetch`. A session that both plans and edits races its own
  checkout and checks its own work.
- **It reads the repository through `git show origin/dev:<path>` after `git
  fetch origin`**, never its own checkout, which is stale the moment a pull
  request merges.
- **It never merges, never declares the iteration done, and never invents an
  approval.** Merging is the PO's. A decision is the PO's words, forwarded as
  written.
- **It does not poll CI.** A child's pull request is bound with the `ccd_pr`
  tools and Auto-fix wakes the child on a red check (`CLAUDE.md`).
- **"The PO follows only the orchestrator" is a goal, not a guarantee.** A
  permission prompt or an app-level card can still surface in a child session.
  Say so when the PO first asks, and when one does, relay it rather than
  guess.

## Procedure

1. `git fetch origin --prune`, then read from `origin/dev`: the iteration
   index, its `Done when`, every task file in it, and the ADRs and
   `docs/architecture.md` sections they link. At an iteration's start, suggest
   `/quality-sweep` once; it is the PO's to run (`CLAUDE.md` "Quality checks").
2. **Plan.** For each task note its `Status`, `Kind`, the tasks and ADRs it
   needs merged first (its Constraints, the stated order), the files it names,
   and whether it is **heavy** (Docker stack, `make verify`, native build,
   simulator, emulator — `worktree` skill) or light. Then apply one rule:
   - **A task starts when** its prerequisites are merged, it names no file an
     in-flight task names, fewer than two heavy sessions are running, and no
     other session holds the Android emulator when it needs it.
   - **Tasks that edit the same file are one lane and run serially** — every
     task touching `mobile/eslint.config.js` waits for the one before it,
     whatever the order says.
   - **Waves** are only how the plan is shown: tasks that can start together.
     Re-plan after every merge round and after any refinement change, never
     keep the first plan.

   Put the plan to the PO: lanes, waves, heavy or light, what blocks what, and
   what you could not decide. Offer the **autonomy choice**: *approve each
   start* or *advance within the approved plan* (recommended: the PO approves
   once, and a start the plan already names needs no second yes; anything the
   plan does not name does). The PO decides what starts.
3. **Write the checkpoint** `.claude/iteration-checkpoint.md` (gitignored by
   `.claude/*.md`) before the first child: the iteration, the base commit, the
   plan as a table (task, kind, heavy or light, files, blockers, session id,
   branch, PR, state), the autonomy choice, the heavy slots in use, and the
   decisions waiting on the PO. Rewrite it after every event. On "resume where
   you left off" read it, then reconcile with `list_sessions` (`linked: true`)
   and `gh pr list`; the file can be stale
   ([ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
4. **Opening pull request.** Start a child for it first: a small pull request
   with no task file whose one change is `docs/roadmap.md`'s row for the
   iteration, `⬜ Todo` → `🔄 In progress`. `make check` fails a task pull
   request, and the `pre-push` `make verify-fast`, while the roadmap says
   `⬜ Todo` and a task is done. So the PO merges this one **before any task
   pull request**, and a child ready sooner waits for the orchestrator's word
   and then merges `origin/dev` (the child brief says so).
5. **Start the children** the plan allows, one session per task, each with the
   standard brief below, `initiation: user_asked` once the PO approved the
   plan, its own worktree, a fresh context. Tell the PO in one line which
   started and which are held and why.
6. **Relay.** A child asks the orchestrator, never the PO. Batch the questions
   of a round, merge duplicates, put them to the PO with the options and a
   recommendation, and answer the child with the PO's words verbatim. A child
   whose answer would change a task's premise stops (step 9).
7. **Verify every report before relaying it.** A child's "done" is a claim:

   - `gh pr view <n> --json state,body,files,statusCheckRollup` and `gh pr
     checks <n>`: every required check green, or failing for a reason the
     child names. Read them once at the report, never in a loop.
   - The task file's `Status` on the branch (`git show origin/<branch>:<path>`),
     the ticked criteria and the pull request body's Gates all say the same
     thing. A body that says `in-progress` over a task marked done is not done.
   - **A pull request that cannot tick every criterion names an owner for the
     rest** (the PO on the phone, another session, a later run) and the task
     stays `refined`; say that to the PO, not "implemented".
   - The diff touches no iteration status and no file another in-flight task
     owns.

   Three reports from iteration 11.5 that this catches: "marked done" over a
   body saying `in-progress`; a child that stopped waiting on a CI run that had
   already failed; "implemented" with the native-run criteria unmet. Send a
   child back with what is wrong, in the words of the evidence.
8. **Digest to the PO**, one message and only when something needs them: what
   is in flight, what waits for review or merge, **the order to merge** (small
   pull requests that touch shared files first, the opening pull request before
   all), and which sessions need a `dev` merge after each. The PO merges.
9. **After a merge round**, fetch, confirm the merges with `gh pr view --json
   state`, update the checkpoint, tell the sessions that need `dev` merged,
   re-plan (step 2) and start what is now unblocked.
10. **New or stale work.** A child may draft a task file at `needs-refinement`
    through a pull request, only when the PO approved it, and the task then goes
    through `refine-task` or `refine-iteration` — only the PO moves it to
    `refined`. A `refined` task that a spike or an implementation contradicts
    goes **back to refinement** (`refine-iteration` "When a refined task has
    gone stale"), and its child stops. Never change a refined task's request
    silently, and never file a "follow-up" a pull request body does not tie to a
    quality-backlog ID (`scripts/check-pr-body.mjs`).
11. **Closing pull request**, once every task is `done` and merged. Start a
    child that re-reads the iteration's `Done when` and **verifies each
    criterion by running it**, then edits `docs/roadmap.md` (the row to
    `✅ Done`, the iteration's entry under "What each iteration built", the one
    home of the feature list that `README.md` and `docs/architecture.md` §1
    point to) and nothing else about status. It reports each criterion's check
    and what it showed. An unmet criterion becomes a **proposed task**, put to
    the PO under step 10, never a quiet close; the same coverage check applies
    when an iteration is planned
    ([ADR-0026](../../../docs/adr/0026-task-file-format.md)). Missing the
    roadmap entry is how the close of 5.5, 6 and 7 drifted. The PO merges it;
    the orchestrator never says the iteration is done.
12. **Tear down**: the children's worktrees follow the `worktree` skill's
    Finish; offer to archive the sessions, only on the PO's yes.

## The child brief

Every child gets the same brief, so none improvises its own process:

- **The task** — its file path and the skill to invoke: `implement-task`
  (`design-task` is not delegated, above).
- **Where from** — a worktree off a freshly fetched `origin/dev`, on branch
  `iteration-N/<topic>`; the `worktree` skill.
- **Weight** — heavy or light, and whether it needs the emulator.
- **Overlaps** — the files other in-flight tasks name, which it must not touch,
  and the tasks whose merge it waits for.
- **The opening pull request may not have merged yet.** If `make verify-fast`
  fails only on the roadmap row, wait for the orchestrator, merge `origin/dev`,
  and push; do not edit the row.
- **Do not edit iteration status.** `docs/roadmap.md` rows and "What each
  iteration built" belong to the opening and closing pull requests; a task pull
  request that touches them is sent back.
- **Ask the orchestrator, not the PO.** One short question by `SendMessage` to
  the orchestrator's session id, then end the turn.
- **No deferral without an ID.** The pull request body says "follow-up" or "new
  task" only with the quality-backlog ID it filed
  (`implement-task` step 8).
- **The report** — pull request link first, then each gate's verdict, each
  criterion ticked or its named owner, and anything the orchestrator must tell
  the PO. The orchestrator verifies it (step 7); the report is not the proof.

## What this does not cover

The PO's judgement on what a task should be, who merges, and the mechanical
gates of a task pull request. Gates for a pull request that completes no task —
the opening and closing ones — are whatever `docs/PULL_REQUEST_TEMPLATE.md`
and `CLAUDE.md` state for it; this skill adds none.
