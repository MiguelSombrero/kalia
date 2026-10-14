# ADR-0076: An index cell that mirrors a file is synced from that file, not kept in step by hand

- **Status:** accepted
- **Date:** 2026-10-14

## Context

Two indexes copy facts out of the files they list. `docs/architecture.md` §9
gives every ADR a row with its title, status and date, and each templated
iteration's `## Tasks` table gives every task a row with its title and status.
The copies were kept by hand, and `scripts/check-adrs.mjs` and
`scripts/check-tasks.mjs` failed whenever one disagreed with its file
([ADR-0019](0019-adr-format-and-conventions.md),
[ADR-0026](0026-task-file-format.md)).

The checks worked: no drift has survived to `dev` since they landed. What they
cost was attention. Every status change is two edits, and the edit-time hook
([ADR-0046](0046-edit-time-checks-and-one-verify-gate.md)) reports the gap
between the first and the second as a failure, so most of what the hook says
to an agent is a reminder to finish an edit it was about to finish anyway.
[ADR-0020](0020-documentation-roles.md) says each fact has one home, and a
title or status held in two places is a fact with two.

## Decision

The title, status and date cells of an index row are copied from the file the
row links, by `scripts/sync-indexes.mjs`, and are never edited by hand.

- **Only cells of rows that already exist are synced.** Which of §9's two
  tables an ADR belongs in, and the order of an iteration's rows, are
  judgements no file records, so adding a row, choosing its table and placing
  it stay hand steps. `check-adrs.mjs` and `check-tasks.mjs` still fail a
  file with no row and a row with no file; they no longer compare cells.
- **The file is the source.** A status is changed in the task file or ADR, and
  an edit made in the index alone is overwritten by the next sync.
- **The edit-time hook writes the sync**, the one thing that hook writes rather
  than reports. A synced cell has exactly one right answer, so writing it
  cannot fight the work the way blocking would. The hook tells the agent which
  file it rewrote, since the agent's copy of that file is now stale.
- **`make check`, and so CI, runs it with `--check`**, failing when a cell is
  out of date. That catches an edit made outside an agent session, where no
  hook ran.
- **Not covered:** `docs/adr/README.md`, whose rows carry a hand-written gloss
  rather than a copy, and the iteration statuses in `docs/roadmap.md`, which
  record a judgement (the iteration DoD gate) rather than a copy.

## Alternatives considered

**Generate the tables whole.** The `make check` step would rebuild each table
from its directory, removing the add-a-row step as well. Rejected, because the
two facts it would need are held nowhere but the tables. Every ADR would need
a new metadata field for its §9 table, and every task file a field for its
position. Adding that field to a `done` task file breaks the rule that a task
file is frozen at completion apart from its status (ADR-0026).

**Drop the copied columns.** Index rows would carry only the link, plus the
ADR's date, so nothing would be duplicated and nothing would need syncing.
Rejected, because the status column is what makes an iteration index readable
at a glance, and losing it would send every reader into each task file.

**Keep the checkers as they were.** No new script, and the duplication stays
visible. Rejected for the cost Context describes: it is paid on every status
change, by the agent and in the hook's output, for a copy a script can make.

## Consequences

- Good, because a status change is one edit. Most of the edit-time hook's
  output for `docs/tasks/` goes away, leaving it to report what actually
  needs a decision.
- Good, because the index can no longer drift at all. Before, drift was only
  detected.
- Bad, because the hook now writes to a file the agent did not edit. An agent
  holding the old text of that index, and editing it straight after, works
  from a stale copy; the hook's message and the editor's own "modified on
  disk" notice are what stop it.
- Neutral, because the add-a-row step still exists, and a missing row still
  fails at edit time. That is the part of the old noise this does not remove.
- **Revisit trigger:** an ADR or task gaining a metadata field for its table or
  position for some other reason. That removes the objection to generating
  the tables whole.

## Evidence

- **What the hook reported**, from every agent session transcript on this
  repository up to 2026-10-14: 185 distinct `PostToolUse` checker reports
  across 58 sessions. 113 of them were `check-tasks.mjs`'s "index status does
  not match file status", the gap between a task file's status edit and its
  index row's.
- **Row order carries meaning.** At `3e6aee0`, the `## Tasks` rows of iteration
  5 run 08 01 02 04 05 06 03 11 12 13 14 09 10, of iteration 7 run 09 05 01
  04 02 06 08 03 07 10, and of iteration 7.5 run 01 02 14 03 04 05 06 07 08 09
  10 16 11 12 13 17 18 15. §9 splits its 75 ADR rows between "Product and
  system architecture" and a process table, a category no ADR file records.
- **The first sync changed nothing.** Run against the tree at `3e6aee0`, it
  rewrote no file: every cell already matched, ADR dates included, because the
  checkers it replaces had held them.
