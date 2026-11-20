---
name: implement-iteration
description: Numbered procedure for an orchestrating session that implements the rest of a refined iteration by delegating each task to a child session, relaying between them and the product owner, verifying each report, and opening the iteration's opening and closing pull requests. Entry point whenever the product owner wants tasks of an iteration implemented, however many are left — invoke before starting the first child session.
---

# Implement an iteration

`implement-task` is the procedure for one task and every rule in it still
binds each child session. This one changes the **unit** from one task to the
rest of an iteration. The session using it is the **orchestrator**: it plans,
delegates, relays and verifies, and the product owner (PO) follows only that
session. Everything that touches the repository happens in a child session,
because a session that holds the whole plan in context and also holds a diff is
the one whose context fills first. It does not change how any one task is
implemented or reviewed.

## When it applies

If the Skill tool does not list this skill (it was `Unknown skill` in the first
use, with the file on disk), read this file and
[`child-brief.md`](child-brief.md) directly; nothing else changes.

Whenever the PO wants tasks of an iteration implemented, whatever is left of
it. The PO may do what time allows today and continue days later in a new
session, or another session may already have done most of it, so the skill takes
the iteration **as `origin/dev` has it** and plans only what remains (step 1).

- **A `design` task** (`design-task`) is not delegated: it needs the PO's own
  visual choices, so the PO works in that session directly. The orchestrator
  plans around it and treats the design record it produces as a prerequisite.
- **Never start a task that is not `refined`**, and only the PO moves one there
  (`CLAUDE.md`). Tasks still at `needs-refinement` go to `refine-iteration`
  first.

## Why the status has its own pull requests

An iteration's status in `docs/roadmap.md` is edited only by an **opening**
pull request (`⬜ Todo` → `🔄 In progress`) and a **closing** one (verifies the
`Done when`, then `✅ Done`), never by a task's. The rule used to be that the
first done task marked it in progress and the last one ran the iteration gate.
With tasks running in parallel no session can know it is first or last: #637,
#638 and #640 each made the same roadmap edit in iteration 11.5. And the author
of the last task is the wrong judge of the whole `Done when`. The same applies
when one session works the tasks serially: it opens the two pull requests too.

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
- **It does not poll CI.** Auto-fix wakes the child on a red check
  (`CLAUDE.md`) where it works (step 6); the orchestrator reads a pull
  request's checks twice, at the report and before the merge order (step 8).
- **An event that changes nothing gets one line or no message**, and the
  PO's open list is never restated unless it changed. A stale watcher's exit
  woke the first use for "nothing to do" and cost the PO a message each time.
- **A cause is a hypothesis until a child confirms it.** Say "likely", and have
  the child check before stating it as fact: the first use called a Dependabot
  branch stale and the child's check showed it was not.
- **"The PO follows only the orchestrator" is a goal, not a guarantee.** A
  permission prompt or an app-level card can still surface in a child session.
  Say so when the PO first asks, and relay what surfaces rather than guess.

## Procedure

1. **Read the iteration's state from the repository**, never from memory or a
   checkpoint. `git fetch origin --prune`, then:
   - the iteration index, its `Done when`, every task file in it, and the ADRs
     and `docs/architecture.md` sections they link, from `origin/dev`;
   - each task's `Status`: `done` and `dropped` are skipped;
   - open pull requests (`gh pr list --state open --json
     number,title,headRefName`), matched to tasks: a task with one is in
     review, not to be started again;
   - linked sessions (`list_sessions` with `linked: true`) and any task
     marked `in-progress` with neither a session nor a pull request, which goes
     to the PO;
   - the roadmap row: already `🔄 In progress`, or an opening pull request
     already open (then step 4 is skipped); every task `done` (then go straight
     to step 12, unless a closing pull request is already open or the row reads
     `✅ Done`, when only the PO's merge is left).

   At an iteration's start, suggest `/quality-sweep` once; it is the PO's to
   run (`CLAUDE.md` "Quality checks").
2. **Plan only what is left.** For each remaining task note its `Kind`, the
   tasks and ADRs it needs merged first (its Constraints, the stated order), the
   files it names, and whether it is **heavy** (Docker stack, `make verify`,
   Metro, a native build, a simulator or an emulator) or **cheap** (none of
   those; the `worktree` skill calls it light). Then apply one rule:
   - **A task starts when** its prerequisites are merged, it names no file an
     in-flight task names, **at most four sessions are running and at most two
     of them heavy** (`CLAUDE.md` caps the heavy ones; the four is this skill's),
     and no other session holds the Android emulator when it needs it. A session
     waiting on the PO or on CI with its stack down is not running.
   - **Tasks that edit the same file are one lane and run serially** — every
     task touching `mobile/eslint.config.js` waits for the one before it,
     whatever the order says.
   - **A task that changes a global check** (compiler flags, lint rules, CI) is
     serial with every task that adds code under it. The lane rule names shared
     files, not shared checks: `noUncheckedIndexedAccess` (task 26) merged
     fifteen minutes after new web tests (task 05), each green on its own base,
     and broke `dev` together (SHOULD-137).
   - **Maintenance sessions count** (a `dev` fix, a Dependabot repair, a CVE
     fix) toward the four and the two heavy.
   - **If a child reports load-related flakiness** (task 17 saw a load average
     of 10 to 50), start fewer sessions until it clears.
   - **Waves** are only how the plan is shown: tasks that can start together.
     Re-plan after every merge round and after any refinement change.

   Put the plan to the PO: lanes, waves, heavy or cheap, what blocks what, and
   what you could not decide. The PO decides what starts. Three things to say
   with it:

   - **Starts happen on the PO's turn.** The app refuses `start_session` on a
     turn that a child's report or a monitor event began, so every wave after the
     first waited for the PO to say "start X". On each of their turns, start
     everything unblocked in one go; the plan's approval does not start a later
     wave by itself.
   - **Parallel children spend the usage budget quickly**: several died together
     on the 5-hour limit. A child that failed on it is resumed by message after
     the reset.
   - **Auto-archive on PR close archives the child**, and a message to an
     archived session fails (step 10). Ask whether to turn the Code tab's
     auto-archive off for the iteration.
3. **Write the checkpoint** `.claude/iteration-checkpoint.md` (gitignored by
   `.claude/*.md`): the plan as a table (task, heavy or cheap, files, blockers,
   session id, worktree, branch, PR, state; the worktree and branch from
   `get_session`, since directory names are recycled and do not match the task),
   whether Auto-fix works (step 6) and the decisions waiting on the PO. It is
   **a cache and never the source of truth**: a new session, in another worktree, will not have it, and one that does must still
   redo step 1, because the file can be stale
   ([ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
4. **Opening pull request**, unless the roadmap row already reads `🔄 In
   progress`. Start a child for it first: a small pull request with no task file
   whose one change is that row. `make check` fails a task pull request, and
   the `pre-push` `make verify-fast`, while the roadmap says `⬜ Todo` and a
   task is done. So the PO merges this one **before any task pull request**, and
   a child ready sooner waits for the orchestrator's word and then merges
   `origin/dev` (the child brief says so).
5. **Start the children** the plan allows, one session per task, each pointed
   at [`child-brief.md`](child-brief.md) and told only what differs (below),
   `initiation: user_asked`, its own worktree, a fresh context. **Omit
   `permission_mode`, so each inherits the orchestrator's own**: the PO is asked
   no more often than the orchestrator's mode asks. Tell the PO in one line which
   started and which are held and why.
6. **Check Auto-fix once, then stop asking.** The PO wants it on for every
   pull request, and only the child can set it: the switch is per session, and
   the auto-mode classifier may deny `set_monitor` (it did for almost every
   child in the first use, and asking the PO to switch it on a dozen times
   changed nothing). At the first child's report read `get_status` with its
   `session_id`. If `auto_fix` is off, write "Auto-fix unavailable" in the
   checkpoint and ask the PO once: a permission rule for the tool, or they
   switch it on per pull request. Then do not ask again. Without it nothing
   wakes a child on a red check, so the orchestrator reads the checks at the
   report and again before the merge order (step 8), and the brief has the child
   say if its checks were still pending.
7. **Relay.** A child asks the orchestrator, never the PO. Batch the questions
   of a round, merge duplicates, put them to the PO with the options and a
   recommendation, and answer the child with the PO's words verbatim. A child
   whose answer would change a task's premise stops (step 11).
8. **Verify every report before relaying it.** A child's "done" is a claim:

   - `.claude/skills/implement-iteration/scripts/pr-report.sh <n>...`
     (read-only): state, merge state, check counts with the failing names,
     whether the diff touches `docs/roadmap.md`, and the task file's status and
     unticked criteria on the branch. Every required check green, or failing for
     a reason the child names. Read once at the report and once before the merge
     order (step 9), never in a loop.
   - The task file's `Status` on the branch (`git show origin/<branch>:<path>`),
     the ticked criteria and the pull request body's Gates all say the same
     thing. A body that says `in-progress` over a task marked done is not done.
   - **A pull request that cannot tick every criterion names an owner for the
     rest** (the PO on the phone, another session, a later run) and the task
     stays `refined`; say that to the PO, not "implemented".
   - **A body that promises something "once task N has merged" is an unfiled
     deferral**: send it back to file an ID or to wait. Task 14's lint ban was
     lost that way and needed a pull request of its own.
   - The diff touches no iteration status and no file another in-flight task
     owns.

   This caught about ten real problems in 11.5, among them "marked done" over a
   body saying `in-progress`, a Maestro run nobody had read, red scans,
   unticked criteria and a lost deferral. Send a child back with what is wrong,
   in the words of the evidence.
9. **Digest to the PO**, one message and only when something needs them: what
   is in flight, what waits for review or merge, **the order to merge** (small
   pull requests that touch shared files first, the opening pull request before
   all), and which sessions need a `dev` merge after each. The PO merges. Also:
   - **A pull request that carries a criterion only the PO can give** is marked
     "do the check before you merge this", and its child holds the task
     `refined` with the owner named until then. After the merge it costs more
     pull requests: task 15's tick commit stranded after #679, then #686 and
     #693 ticked and closed it. Task 07's fresh-session run, done before the
     merge, needed none.
   - **A merge that changes a global check** (step 2) is named, with what it
     obliges the rest (step 10).
   - **The last line names what to say to start the next wave** ("say
     `start 12, 14`"), since starts need the PO's turn (step 2).
10. **After a merge round**, fetch, confirm the merges with `gh pr view --json
    state`, update the checkpoint, tell the sessions that need `dev` merged,
    re-plan (step 2) and start what is now unblocked.
    - **Tell them in one batch message.** Every task pull request flips its own
      row in the iteration index, so each merge turns the next pull requests
      `DIRTY`: about fifteen rounds in 11.5 (filed as SHOULD-139).
    - **After a merge of a task that changed a global check, every open pull
      request merges `dev` and re-verifies before the next merge**; the digest
      says which.
    - **A follow-up on a merged task goes to a fresh child** pointed at the
      brief file, not to the old one, which auto-archive has probably archived;
      its worktree directory may already be recycled.
11. **New or stale work.** A child may draft a task file at `needs-refinement`
    through a pull request, only when the PO approved it, and the task then goes
    through `refine-task` or `refine-iteration` — only the PO moves it to
    `refined`. A `refined` task that a spike or an implementation contradicts
    goes **back to refinement** (`refine-iteration` "When a refined task has
    gone stale"), and its child stops. Never change a refined task's request
    silently, and never file a "follow-up" a pull request body does not tie to a
    quality-backlog ID (`scripts/check-pr-body.mjs`).
12. **Closing pull request**, once every task is `done` and merged. Start a
    child that re-reads the iteration's `Done when` and **verifies each
    criterion by running it**, then edits `docs/roadmap.md` (the row to
    `✅ Done`, the iteration's entry under "What each iteration built", the one
    home of the feature list that `README.md` and `docs/architecture.md` §1
    point to) and nothing else about status. It reports each criterion's check
    and what it showed. An unmet criterion becomes a **proposed task**, put to
    the PO under step 11, never a quiet close; the same coverage check applies
    when an iteration is planned
    ([ADR-0026](../../../docs/adr/0026-task-file-format.md)). Missing the
    roadmap entry is how the close of 5.5, 6 and 7 drifted. The PO merges it;
    the orchestrator never says the iteration is done.

    **It cannot open while a live task is not `done`**: `scripts/check-tasks.mjs`
    fails a `✅ Done` row then, so the 11.5 close waited on task 15 while its
    criterion belonged to the PO. Criteria only the PO can give land before the
    closing pull request, or the PO decides to drop or move the task. Closing
    with an open item is an ADR-0026 change, not a workaround.

    `scripts/check-tasks.mjs` does not fail an iteration with every task done
    and the row still `🔄 In progress`, because this pull request follows the
    last task's. Nothing mechanical prompts the close, so start it as soon as the
    last task merges. **Revisit trigger:** an iteration left `🔄 In progress`
    after its last task — add a checker.
13. **Tear down**: the children's worktrees follow the `worktree` skill's
    Finish; offer to archive the sessions, only on the PO's yes.

## When `dev` is red, or a check fails on something the PR does not touch

`dev` went red three times in 11.5 with no task pull request at fault: a merged
pair of tasks that broke the web type-check together (#661), then two new CVE
advisories in images no pull request touched. A red `dev` blocks every child's
`pre-push` `make verify-fast` and every open pull request, and a few children
pushed their own copy of the fix before a hold reached them.

1. **Read `gh run list --branch dev`** for the head's state before anything.
2. **Start one maintenance child** for the fix, counted in the caps (step 2).
3. **Broadcast to every child**: do not fix it in your pull request, hold the
   push, and merge `dev` when told.
4. **A new vulnerability gets its own pull request, and each proposed pin is one
   batched question to the PO** (`CLAUDE.md` "New dependencies"). This is the
   case [ADR-0024](../../../docs/adr/0024-dependency-vulnerability-scanning.md)'s
   "fixed on whatever branch is open" does not reach: it weighs one open branch
   against a second pull request, and here every open branch would carry the
   same fix.

## The child brief

[`child-brief.md`](child-brief.md) is the one brief every child gets, so none
improvises its own process and no start retypes it (the first use typed about
900 words fifteen times, and the first wave lacked what later ones learned).
Each start names only: the task file, the files other in-flight tasks name, its
weight and whether it needs the emulator, the tasks whose merge it waits for,
and the orchestrator's session id.

## What this does not cover

The PO's judgement on what a task should be, who merges, and the mechanical
gates of a task pull request. Gates for a pull request that completes no task —
the opening and closing ones — are whatever `docs/PULL_REQUEST_TEMPLATE.md`
and `CLAUDE.md` state for it; this skill adds none.
