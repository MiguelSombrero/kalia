# ADR-0084: An unexpected failure is logged as it happens and counted by the sweep, so recurrence survives the session

- **Status:** accepted
- **Date:** 2026-10-24
- **Amended:** 2026-10-30 — a red run on `dev` after a merge has no branch to
  be logged on; the session that starts work logs it, from the `worktree`
  skill's start step

## Context

[ADR-0051](0051-process-retrospection-belongs-to-the-sweep.md) made
`/quality-sweep`'s `process-quality` dimension the place where this
repository audits its own process. It also made recurrence that dimension's
evidence bar: two or more occurrences in separate pull requests, never one
session. The only evidence the dimension can read is the merged history, and
the failures that recur most often never reach it. When a tool call fails,
an agent corrects it, retries, and moves on. The pull request shows the
retry's result, not the failure.

The failures this misses do recur. The product owner has watched tool-call
errors come back across sessions. The lessons that did get written down went
to places the sweep doesn't read: an agent's auto-memory, which lives on one
machine, outside the repository and outside review (a Maven run under the
wrong JDK, a stale `node_modules` in a fresh worktree), or
[docs/ci-playbook.md](../ci-playbook.md), which covers red CI checks and
nothing that fails locally.

ADR-0051 considered a per-task friction log for exactly this purpose and
deferred it, on the grounds that its per-task cost was worth paying only once
the dimension proved short of evidence. Its revisit trigger, two sweeps in a
row with nothing to report, has not fired. The product owner is reopening the
question anyway, because waiting for the trigger means losing the evidence the
trigger is waiting for.

Two constraints shape the answer. Sessions run in parallel worktrees
(`CLAUDE.md`), so any shared file that every session edits is a merge-conflict
source. And [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md)
found that agents break rules they have in context, so a logging rule that is
expensive to follow will mostly not be followed.

## Decision

**Every unexpected failure an agent hits is appended as one row to
[docs/common-failures.md](../common-failures.md) on the branch it happened on,
and only the `process-quality` dimension of `/quality-sweep` groups and counts
those rows.**

- **The log is append-only.** Each row is one occurrence: date, branch or
  pull request, a normalized signature, and the agent's best explanation of
  why. A row is never edited or removed afterwards, and a better
  understanding of an old row goes into a new one. `.gitattributes` gives
  the file git's `union` merge driver, so rows appended in parallel worktrees
  merge without conflict.
- **No running count.** Deciding that two rows are the same failure is a
  judgment, and the sweep makes it in one batch, reading the rows dated since
  the previous sweep. A recurrence it finds is evidence under ADR-0051's bar,
  and the finding lands in the quality backlog like any other.
- **What counts as unexpected** is defined in the log's own header, because
  that header is what an agent sees when it writes a row: a failure caused by
  tooling, the environment or a wrong assumption on the agent's part, that
  cost a retry. Product bugs, intentionally red tests and failures that are
  part of normal operation do not count.
- **The log is evidence, not a fix.** Once a failure is understood, the fix
  goes to its own home: a mechanism, a `ci-playbook.md` entry, or a README
  line ([ADR-0020](0020-documentation-roles.md)). A row that names the home
  is enough. The log never becomes a second copy of a fix.

> **Amended 2026-10-30.** "On the branch it happened on" has no answer for a
> run that goes red on `dev` after a merge: no session is working on it, so
> nobody logs it. Runs `40077060971`, `40166251873` and `40168778643` stayed
> out of the log for that reason, and they are the failures that hit every
> session at once. Whoever **starts work** logs it: the `worktree` skill's
> start step already fetches `dev`, and also reads `dev`'s `CI` runs from the
> last seven days and appends one row, on the new branch, for each red run
> the log does not yet account for. A row for a `dev` run names its run id in
> *Where*, which is what the next session matches against. Rejected: the
> sweep reconstructing them from run history, which is too late, and a
> scheduled workflow opening an issue, which is a second place to look.

**Not decided here:** a hook that prompts for a row when a tool call fails.
That would be ADR-0039's answer to a rule that keeps being skipped, and it
waits until the rule is shown to be skipped. See the revisit trigger.

## Alternatives considered

**A table with one row per failure and a running count**, the shape the
product owner first proposed. Rejected for two reasons. Two worktrees that
bump the same count conflict, and either resolution undercounts. And a count
cannot show ADR-0051's evidence, occurrences across *separate* pull requests,
without a list of where each one happened, at which point the list is the
data and the count can be derived from it.

**Keeping these lessons in agent auto-memory**, the status quo for local
failures. Rejected because memory is per-machine, outside the repository and
never reviewed. It helps one agent on one machine avoid a failure, but cannot
show anyone, the sweep included, that the failure recurs.

**Extending `docs/ci-playbook.md` to local failures.** Rejected because the
playbook is a lookup table from a known signature to its fix, admitted only
once recognising a failure has cost real time. A log of every occurrence
would bury that lookup in raw data.

**Waiting for ADR-0051's revisit trigger.** Rejected. That trigger fires only
after two sweeps have already come up empty, so the evidence it would have
wanted has already been lost by then.

## Consequences

- Good, because recurrence becomes visible across sessions, machines and
  pull requests, which is exactly the evidence ADR-0051 requires and cannot
  get from the merged history alone.
- Good, because a row costs one appended line, and an agent writing one
  never needs to read or match earlier rows.
- Bad, because every row is diff the product owner reviews in a pull request
  about something else. The cost is small per row, but it is paid on every
  task that hits a failure.
- Bad, because it is a prose rule with no mechanism behind it, the kind
  ADR-0039 found agents skip. A skipped row fails silently.
- Neutral, because a failure in a session that opens no pull request leaves
  no row unless that session commits one. The log records what pull requests
  carry, like the history it supplements.
- Neutral, because the union merge driver also accepts duplicate lines and
  makes no attempt to order rows, so two worktrees' rows can land in either
  order. The sweep reads by date, so this does not matter.
- Neutral, because two sessions that start before either has merged can both
  append a row for the same `dev` run. The union driver keeps both and the
  sweep counts one failure, as it does for any duplicate.
- **Revisit trigger:** a sweep finding failures in the history, such as a
  fix commit or a red CI run, with no matching row. That shows the rule
  being skipped and earns the hook deferred above. Separately: a log too long
  for the sweep to read in one pass.

## Evidence

The union driver, checked on 2026-10-24 with git 2.54.0 in a scratch
repository: a two-line table with `merge=union`, and two branches off it that
each append one row. `git merge` reported `Auto-merging log.md` with no
conflict, and the file held both rows, the merged-in branch's row second.

Not checked: whether GitHub's own merge button applies `.gitattributes` merge
drivers. If it doesn't, a pull request whose rows collide with rows already
merged to `dev` shows as conflicted, and merging `dev` into the branch
locally clears it with the same union result.
