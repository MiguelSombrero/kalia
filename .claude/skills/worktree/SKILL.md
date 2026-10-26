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

## Start

1. Fetch first: `git fetch origin --prune`. A worktree branched off a local
   `dev` that has not moved in a week starts life behind, and every conflict
   that follows is a consequence of this one step being skipped.
2. Remove the worktrees whose work has landed. For each one under
   `.claude/worktrees/` other than your own (`git worktree list`): confirm its
   pull request merged — `gh pr view <branch> --json state` says `MERGED` —
   and that it holds nothing unmerged: `git log --oneline origin/dev..<branch>`
   and `git -C <path> status --porcelain` both print nothing. Then
   `git worktree remove` it and `git branch -d` its branch. Skip any that
   fails a test. Finish with `git worktree prune` and delete any empty
   directory left under `.claude/worktrees/`. The Finish steps cannot do
   this: the merge happens after the session that would run them has ended,
   so this is the step that actually runs.
3. Create the worktree off the **remote** ref, never the local branch:
   `git worktree add .claude/worktrees/<name> -b <branch> origin/dev`.
   Branch naming is `CLAUDE.md`'s: `iteration-N/<topic>`, `docs/<topic>`,
   `fix/<topic>`. (`claude --worktree <name>`, or asking Claude Code for a
   worktree, does the equivalent and puts it in the same place.) Worktrees
   share one object database, so an extra one costs no extra clone — only
   isolation, and the disk the removal in step 2 reclaims.
4. Install the frontend's dependencies: `(cd frontend && npm ci)`. A new
   worktree has no `frontend/node_modules`, so `make verify-fast` fails
   without it and the edit hook skips ESLint silently
   (`scripts/hooks/post-edit-check.mjs`). Add a root `.env` for the stack if
   you will bring it up (`README.md`).
5. Work from that directory for everything that follows, and never `cd` to
   the main checkout — `CLAUDE.md`'s environment note on two sessions racing
   on one `HEAD` is about exactly this.
6. Confirm the binding before trusting any gate, and again at the top of any
   review: `pwd` and `git log --oneline origin/dev..HEAD` together say which
   tree you are in and which commits a review would cover. A `/code-review`
   that reports on the wrong range is not a review.
7. If the task will run long or fan out to parallel agents, write the
   checkpoint `implement-task` step 3 describes before starting.

## Finish

8. Confirm the pull request actually merged — `gh pr view --json state` —
   before removing anything. A worktree still holding unpushed commits is
   the one case where removal loses work.
9. `git worktree remove .claude/worktrees/<name>` and
   `git branch -d <branch>`.
10. `git worktree list` to confirm what is left. Claude Code's own sweep will
   not do this for you: it skips any worktree with uncommitted or unpushed
   work, which is every task worktree, and never touches one a session
   started in. A stale worktree costs roughly 640 MB once `npm install` has
   run in it, and eight of them once reached 2.0 GB.
