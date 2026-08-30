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
2. Create the worktree off the **remote** ref, never the local branch:
   `git worktree add .claude/worktrees/<name> -b <branch> origin/dev`.
   Branch naming is `CLAUDE.md`'s: `iteration-N/<topic>`, `docs/<topic>`,
   `fix/<topic>`. (`claude --worktree <name>`, or asking Claude Code for a
   worktree, does the equivalent and puts it in the same place.)
3. Work from that directory for everything that follows, and never `cd` to
   the main checkout — `CLAUDE.md`'s environment note on two sessions racing
   on one `HEAD` is about exactly this.
4. Confirm the binding before trusting any gate, and again at the top of any
   review: `pwd` and `git log --oneline origin/dev..HEAD` together say which
   tree you are in and which commits a review would cover. A `/code-review`
   that reports on the wrong range is not a review.
5. If the task will run long or fan out to parallel agents, write the
   checkpoint `implement-task` step 0 describes before starting.

## Finish

6. Confirm the pull request actually merged — `gh pr view --json state` —
   before removing anything. A worktree still holding unpushed commits is
   the one case where removal loses work.
7. `git worktree remove .claude/worktrees/<name>` and
   `git branch -d <branch>`.
8. `git worktree list` to confirm what is left. Claude Code's own sweep will
   not do this for you: it skips any worktree with uncommitted or unpushed
   work, which is every task worktree, and never touches one a session
   started in. A stale worktree costs roughly 640 MB once `npm install` has
   run in it, and eight of them once reached 2.0 GB.
