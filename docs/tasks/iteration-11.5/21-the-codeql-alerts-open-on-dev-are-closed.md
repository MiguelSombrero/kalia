# Task 21: The CodeQL alerts open on `dev` are closed

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Two CodeQL alerts are open on `dev`. Neither fails a pull request, because
both are on `dev` already. Each one makes the next real alert easier to
miss:

- **Alert 8, `js/clear-text-logging`, on `scripts/mobile-native.mjs`'s
  `console.error(error.message)`**, open since 2026-11-04. The local stand-in,
  `scripts/check-clear-text-logging.mjs`, does not reach it. The alert names
  no flow path. The one candidate in the file, an emulator name read from
  `process.env.AVD` and built into an Error, is a direct read that CodeQL
  passes elsewhere.
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

- **The alert's flow is visible only on its page in GitHub's code scanning
  view, to the repository's owner.** The product owner reads it and passes
  on the flow, in words, at refinement or when the task starts.
- `scripts/check-tasks.mjs` and `scripts/check-adrs.mjs` read the same
  cells. A change to the escaping must keep all three in agreement
  ([ADR-0076](../../adr/0076-index-cells-are-synced-from-their-files.md)).

## Open questions

- **Integrations.** What flow does alert 8's page show? The product owner
  reads it from the code scanning view.
- **Edge cases.** Should the writer refuse a title holding a pipe or a
  backslash instead of escaping it? A task title has never needed one.

## Acceptance criteria

- [ ] A `sync-indexes` test writes and reads back a title holding `\|` and a
      trailing `\`, and the cell is intact. It failed before the change
- [ ] If the stand-in can follow alert 8's flow, a
      `check-clear-text-logging` fixture of that shape fails
- [ ] CodeQL on this branch's pull request reports alerts 5 and 8 as fixed
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-134 and COULD-135.
