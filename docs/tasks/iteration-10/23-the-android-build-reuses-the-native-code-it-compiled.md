# Task 23: The Android build reuses the native code it already compiled

- **Status:** done
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

The build step of `Mobile E2E (Maestro, Android)` takes 8–12 minutes whatever
Gradle's cache holds: its dependency resolution and daemon start are about two,
and the Gradle cache restores in 14 s without moving the total beyond the
run-to-run spread (7:51 and 12:27 cold, 9:17 and 9:43 warm). About six minutes
are CMake configuring and compiling React Native's native libraries once per
module — screens, worklets, reanimated, gesture-handler, expo-modules-core,
then the app — and Gradle's build cache does not cover those tasks. The native
sources change rarely; the compile happens on every run (quality backlog
COULD-106, found in [task 07](07-mobile-e2e-fails-only-when-the-app-does.md),
whose measurements are in its pull request).

Each candidate fix is new tooling with a stale-build risk — a cache that
returns a library compiled from older sources makes a green run meaningless —
so which one, if any, is a decision with a rejected alternative.

## Scope

The Android end-to-end job's build step does not recompile native libraries
whose sources and toolchain have not changed, or the pull request records with
measurements why no cache is worth its risk.

## Non-goals

- Whether the job runs at all for a change — [task 22](22-mobile-ci-runs-only-when-the-app-can-change.md).
- The emulator and flow — [task 07](07-mobile-e2e-fails-only-when-the-app-does.md).
- A paid cache, runner or service: Kalia adds no cost
  ([CLAUDE.md](../../../CLAUDE.md)).

## Constraints

- The job's `actions/cache` is already pinned at the version the product owner
  agreed in task 07. Any other new Action or tool — a `ccache` install, for
  one — has its version proposed from marketplace or package output and agreed
  by the product owner in this task's pull request before it merges.
- A cache key names everything that can change the compiled output: the native
  sources, the lockfile, `mobile/app.json` and `mobile/plugins/**`, and the
  toolchain versions. A hit must never serve a stale library.
- Measurements come from the CI runner, not a laptop; the experiments run on
  throwaway branches deleted with the pull request, as task 07's did.

**Decided at refinement, 2026-11-01** (product owner):

- **Measure, decide, implement.** The task compares `ccache` keyed on the
  native sources with caching the CMake output and Gradle's task history, on
  real runner runs; records the choice, and the rejected alternative, in an
  ADR; and implements it.
- **A cache is kept only if it cuts the build step's median by at least three
  minutes** over at least five warm runs on the task's branch. Otherwise the
  ADR records the negative result and no cache is merged.

## Open questions

**None.**

## Acceptance criteria

- [x] The pull request shows the build step's duration for at least five warm
      runs and a cold run for each candidate and for the unchanged job, with
      run links
- [x] An ADR records the choice, or the negative result, and the alternative
      not taken
- [x] If a cache is merged: a test shows its key changing with a native
      source, the lockfile, `mobile/app.json` and the toolchain version
- [x] If a cache is merged: a run after a deliberate change to a native source
      recompiles that library, and the median build-step time is at least
      three minutes lower than the unchanged job's
- [x] The versions of any new Action or tool are agreed by the product owner
      in the pull request
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-106.
