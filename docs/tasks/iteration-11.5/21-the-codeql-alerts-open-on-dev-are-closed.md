# Task 21: The CodeQL alerts open on `dev` are closed

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Two CodeQL alerts are open on `dev`. Neither fails a pull request, because
both are on `dev` already. Each one makes the next real alert easier to
miss:

- **Alert 8, `js/clear-text-logging`, on `scripts/mobile-native.mjs`'s
  `console.error(error.message)`**, open since 2026-11-04. The local stand-in,
  `scripts/check-clear-text-logging.mjs`, does not reach it. Its flow runs
  across three files, from the stack's environment into an `xcodebuild`
  argument and from there into an error message (Constraints).
- **Alert 5, `js/incomplete-sanitization`, on `scripts/sync-indexes.mjs`'s
  cell writer**, open since 2026-10-14. The writer escapes `|` but not `\`.
  A title holding `\|` is therefore written as `\\|`, and that pipe then ends
  the cell. No local check covers this query.

`scripts/mobile-native.mjs` is the entry point to every native build that
iteration 12 runs, and the index writer runs on every task-file edit.

## Scope

- Each alert's cause is fixed, and CodeQL reports both as fixed on this
  branch.
- `mobile-native.mjs`'s error message says what failed without carrying the
  value CodeQL traces.
- The index writer escapes a backslash as well as a pipe, so any title
  survives a round trip through a table cell.
- The local stand-in covers the flow's shape if it can follow it, or says in
  its header that it cannot.

## Non-goals

- Adopting the CodeQL CLI locally, which
  [iteration 10.5 task 21](../iteration-10.5/21-a-failure-ci-would-report-is-caught-before-the-push.md)
  decided against.

## Constraints

- **The alert's flow is visible only to the repository's owner**, in the
  code scanning view or the analysis's SARIF. It is recorded below in words.
  The team id itself never appears in a commit, a pull request or a log
  ([CLAUDE.md](../../../CLAUDE.md)).
- `scripts/check-tasks.mjs` and `scripts/check-adrs.mjs` read the same
  cells. A change to the escaping must keep all three in agreement
  ([ADR-0076](../../adr/0076-index-cells-are-synced-from-their-files.md)).
- **Decided at refinement (2026-11-15):**
  - Alert 8's flow was read at refinement from `dev`'s CodeQL analysis. The
    traced value is the Apple team id, not the emulator name:
    1. `stackEnv()` reads it from the environment
       (`scripts/stack-ports.mjs:45`);
    2. it is passed into `xcodebuildArgs` as `DEVELOPMENT_TEAM=${teamId}`
       (`scripts/mobile-ios-device.mjs:69`);
    3. `step()` builds its error from the arguments
       (`${command} ${args[0]} failed`, `mobile-ios-device.mjs:96`);
    4. `mobile-native.mjs:138` logs `error.message`.

    CodeQL tracks the array as a whole, so it flags `args[0]` (which is
    `-workspace`) as tainted. The fix keeps every argument out of the
    message.
  - The index writer escapes a backslash and a pipe, and refuses neither:
    any title survives a round trip.

## Open questions

**None.**

## Acceptance criteria

- [x] A `sync-indexes` test writes and reads back a title holding `\|` and a
      trailing `\`, and the cell is intact. It failed before the change
- [x] A test shows `step()`'s error naming the command and its exit status
      and no argument
- [x] If the stand-in can follow alert 8's flow, a
      `check-clear-text-logging` fixture of that shape fails; if it cannot,
      its header says so
- [x] CodeQL on this branch's pull request reports alerts 5 and 8 as fixed
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-134 and COULD-135.
