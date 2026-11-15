# Task 20: Two worktrees run side by side in phone mode, and a low disk is named before it fails a build

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Mobile work runs in parallel worktrees, with up to two heavy sessions at once
([CLAUDE.md](../../../CLAUDE.md)). Two things about running them side by side
are unproven or keep breaking:

- **Two worktrees, one in phone mode and one not, have never been run side by
  side.** `make phone-mode` replaces the machine's `tailscale serve` forwards
  with the calling worktree's four ports
  ([ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).
  [Iteration 10 task 02](../iteration-10/02-the-phone-reaches-the-stack.md)
  showed this on one worktree. The claim that a second worktree's switch
  removes the first's forwards, rather than colliding with them, is reasoned
  from `tailscale serve reset` and has not been shown. It is ADR-0097's last
  unverified point.
- **A full disk has failed work three times, each time with an error that does
  not say so.** Postgres in Testcontainers could not write its WAL (Docker's
  build cache, 2026-10-30). A Gradle release build could not extract an AAR
  (several worktrees' Xcode DerivedData, 2026-10-31). `make verify`'s Android
  step hit `No space left on device` on PR 534. The third failure came after
  the `worktree` skill had gained its "check free disk" step, so a step in a
  skill was not enough. Every worktree adds to both caches, and iteration 12
  adds more native builds.

## Scope

- Two worktrees' stacks are brought up, `make phone-mode` is run in each in
  turn, and `tailscale serve status` is read after each. ADR-0097 is amended
  with the result. Any collision is fixed in `scripts/phone-mode.mjs`.
- A session is warned, in the session only, when free disk space is low. The
  warning names the caches that use the most space.
- Removing a worktree also removes that worktree's own Xcode DerivedData.

## Non-goals

- Running more than two heavy sessions at once.
- Pruning Docker's caches automatically. Another worktree's stack may still
  need them.

## Constraints

- **The SessionStart hook runs `scripts/prune-worktrees.mjs`** with a
  60-second timeout, and the hook's failure must not stop a session from
  starting (`|| true` in `.claude/settings.json`).
- **Nothing from the host machine leaves it.** A warning names caches by
  kind, never by an absolute path, in anything committed
  ([CLAUDE.md](../../../CLAUDE.md)). The tailnet's host name stays out of the
  pull request.
- **Phone mode reaches one origin as the issuer** (ADR-0097). A second
  worktree's switch must leave the phone signed in to exactly one stack.
- Ports are read from each worktree's `.env` (`make stack-env`), never
  hard-coded.
- **Decided at refinement (2026-11-15):**
  - The warning appears below a fixed 20 GB of free space.
  - The `worktree` skill's teardown deletes the removed worktree's own Xcode
    DerivedData, found by the workspace path Xcode records in it, and
    nothing else.
  - If phone mode does collide, a second worktree's switch takes over and
    names the worktree it replaced, rather than refusing.

## Open questions

**None.**

## Acceptance criteria

- [ ] The two-worktree run is done, and the pull request records in words what
      `tailscale serve status` showed after each switch. ADR-0097 is amended
      with the result
- [ ] A `prune-worktrees.test.mjs` case, with free space faked below 20 GB,
      prints the warning and names the caches. A case above it prints nothing
- [ ] A test shows the teardown removing the removed worktree's DerivedData
      and leaving another worktree's in place
- [ ] A `phone-mode` test shows a switch that replaces another worktree's
      forwards naming that worktree
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-108 and COULD-114.
The two disk rows are in [common-failures](../../common-failures.md). The PR
534 failure was not logged there.
