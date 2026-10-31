---
name: worktree
description: Numbered procedure for starting and tearing down a task worktree — branching off a freshly fetched dev, confirming which tree the session is bound to, and removing the worktree once its pull request merges. Entry point whenever a task needs its own checkout, and before running any verification gate that must be scoped to that checkout.
---

# Start and finish a worktree

`CLAUDE.md`'s "Parallel sessions" bullet already states why a session gets
its own worktree; nothing here changes that. This orders the setup and
teardown the way `implement-task` orders the implementation gates, because
the recurring failures were never in the work — they were a branch cut from
a stale `dev`, a review scoped to the wrong tree, and worktrees nobody
removed ([ADR-0046](../../../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

## How many at once

`CLAUDE.md` caps heavy sessions at two. A session is **heavy** while it runs
the Docker stack, `make verify`, a native build, a simulator or an emulator;
one that only reads, edits docs, reviews or waits on CI is light, and the cap
does not count it.

- **The session that starts others counts first** — `list_sessions` with
  `linked: true` — and starts a task only while fewer than two are heavy.
  Order the work so that tasks needing the emulator or a long `make verify`
  do not overlap; start the next when a session ends.
- **A session that will wait long** (on CI, on review, on the product owner)
  stops its stack first with `docker compose down`, without `-v`, so the wait
  costs nothing. `make stack-env` brings it back.
- **One session at a time drives the Android emulator.** The next waits for
  the holder to say it is done and leaves the emulator as it found it.
- **Check free disk before creating a worktree** (`df -h .`): a worktree with
  its dependencies installed is several GB, and a full disk fails builds with
  errors that do not name it.

## Start

1. Fetch first: `git fetch origin --prune`. A worktree branched off a local
   `dev` that has not moved in a week starts life behind, and every conflict
   that follows is a consequence of this one step being skipped.
2. Read `dev`'s recent CI runs and log the red ones nobody has logged. A
   run that goes red on `dev` after a merge has no session working on it, so
   the session that starts work is the one that records it
   ([ADR-0084](../../../docs/adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)):
   `gh run list --branch dev --workflow CI --status failure --limit 10
   --json databaseId,createdAt,displayTitle`, and look at the runs from the
   last seven days. A run is logged when a row in
   [docs/common-failures.md](../../../docs/common-failures.md) names its id
   or its pull request, or describes the same failure; for each that is not,
   read `gh run view <id> --log-failed` and, once step 4 has made the
   branch, append one row to it, naming the run id and the failing job in
   *Where*. Only the `CI` workflow is read; the separate `Vulnerability
   scan` and `CodeQL` workflows are not part of this step.
3. Remove the worktrees whose work has landed. For each one under
   `.claude/worktrees/` other than your own (`git worktree list`): confirm its
   pull request merged — `gh pr view <branch> --json state` says `MERGED` —
   and that it holds nothing unmerged: `git log --oneline origin/dev..<branch>`
   and `git -C <path> status --porcelain` both print nothing. Then
   `git worktree remove` it and `git branch -d` its branch. Skip any that
   fails a test. Finish with `git worktree prune` and delete any empty
   directory left under `.claude/worktrees/`. The Finish steps cannot do
   this: the merge happens after the session that would run them has ended,
   so this is the step that actually runs.
4. Create the worktree off the **remote** ref, never the local branch:
   `git worktree add .claude/worktrees/<name> -b <branch> origin/dev`.
   Branch naming is `CLAUDE.md`'s: `iteration-N/<topic>`, `docs/<topic>`,
   `fix/<topic>`. (`claude --worktree <name>`, or asking Claude Code for a
   worktree, does the equivalent and puts it in the same place.) Worktrees
   share one object database, so an extra one costs no extra clone — only
   isolation, and the disk the removal in step 3 reclaims.
5. Install the JavaScript dependencies: `npm ci` at the repository root, one
   install for every workspace. A new worktree has no `node_modules`, so `make verify-fast` fails
   without it and the edit hook skips ESLint silently
   (`scripts/hooks/post-edit-check.mjs`). To bring the stack up, add a root
   `.env` with the client secret (`README.md`), then run `make stack-env`: it
   appends this worktree's own host ports to that file, so the stack can run
   beside another worktree's. Re-running it keeps what it wrote.
6. Work from that directory for everything that follows, and never `cd` to
   the main checkout — `CLAUDE.md`'s environment note on two sessions racing
   on one `HEAD` is about exactly this.
7. Confirm the binding before trusting any gate, and again at the top of any
   review: `pwd` and `git log --oneline origin/dev..HEAD` together say which
   tree you are in and which commits a review would cover. A `/code-review`
   that reports on the wrong range is not a review. `pwd` is for you alone:
   it never goes in a commit or pull request (`CLAUDE.md`, host data).
8. If the task will run long or fan out to parallel agents, write the
   checkpoint `implement-task` step 3 describes before starting.

## Finish

9. Confirm the pull request actually merged — `gh pr view --json state` —
   before removing anything. A worktree still holding unpushed commits is
   the one case where removal loses work.
10. `git worktree remove .claude/worktrees/<name>` and
   `git branch -d <branch>`.
11. `git worktree list` to confirm what is left. Claude Code's own sweep will
   not do this for you: it skips any worktree with uncommitted or unpushed
   work, which is every task worktree, and never touches one a session
   started in. A stale worktree costs roughly 640 MB once `npm install` has
   run in it, and eight of them once reached 2.0 GB.

## A red check

A check that goes red while you work in the worktree follows two rules, moved
here whole from `CLAUDE.md`
([ADR-0048](../../../docs/adr/0048-what-survives-a-claude-md-bullet.md)):

- **An unexpected failure gets one appended row in
  [docs/common-failures.md](../../../docs/common-failures.md)**, on the branch
  it happened on
  ([ADR-0084](../../../docs/adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
  A run that went red on `dev` after a merge belongs to no branch; Start
  step 2 logs it.
- **A CI check you have seen fail before is probably in
  [docs/ci-playbook.md](../../../docs/ci-playbook.md)**; add an entry when a
  failure costs real time to *recognise*, naming the run.
