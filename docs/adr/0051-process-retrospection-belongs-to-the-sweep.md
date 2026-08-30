# ADR-0051: Process retrospection belongs to the sweep, not to every task

- **Status:** accepted
- **Date:** 2026-08-30

## Context

Every mechanism this repository runs against itself watches the product.
`/quality-sweep`'s dimensions read `docs/`, every `README.md`, `backend/src`
and `frontend/`; `check-adrs.mjs`, `check-tasks.mjs` and `check-comments.mjs`
guard documents and source. Nothing reads `.claude/`, `scripts/`, the
`Makefile` or `CLAUDE.md` itself — the files that decide how agents work here,
and the ones this process-first repository has spent the most effort on. The
coverage gap is exact rather than approximate, and Evidence below shows the
count.

The proposal that raised the question was to close that gap per task: a final
step on `implement-task`, after the pull request is opened, in which the agent
reviews the session it just finished for anything worth turning into a skill,
hook, script or command.

Two forces already recorded here act on it from opposite directions.
[ADR-0039](0039-mechanisms-for-recurring-rule-violations.md)'s test for whether
a rule earns a mechanism is recurrence — "a failure that survives being pointed
out is systematic rather than a run of lapses" — and recurrence is by
definition not observable from inside one session.
[ADR-0027](0027-process-weight.md)'s is cost: a per-task step is paid on every
task forever, whether or not that task had anything to say.

## Decision

**Auditing this repository's own process is a fifth dimension of
`/quality-sweep` — `process-quality` — and never a step in a per-task skill.**

- Its scope is what the other four do not read: `.claude/` (skills, rules,
  settings), `scripts/` and its hooks, the `Makefile`, and the merged history
  since the previous sweep. `docs/PULL_REQUEST_TEMPLATE.md` is the single
  deliberate overlap — documentation-quality reads it for staleness, this
  dimension as a gate mechanism — and the skill says which lens is whose so
  one finding is not filed twice.
- **A process finding must cite recurrence or absence, never a single
  session.** Two or more occurrences across separate pull requests, or a
  mechanism that provably does not exist for a rule the files state. One
  session's friction is an anecdote; telling the two apart is what this
  dimension is for, and a dimension that accepted anecdotes would be the
  rejected per-task step wearing a sweep's clothes.
- It reports, and changes no process itself. Findings land in
  `docs/tasks/quality-backlog.md` under the same MoSCoW grading and permanent
  IDs as every other finding, and the product owner lifts them the same way
  ([ADR-0026](0026-task-file-format.md)).
- Proposing a new skill, hook or checker is in scope **only** with the evidence
  of the recurring failure it would catch. A tool that would be nice to have is
  not a finding.

**Not decided here:** any particular process change. This settles where the
question gets asked, not what the answer is.

## Alternatives considered

**A retrospection step at the end of `implement-task`** — the proposal that
raised this, and the reason the question was asked at all. Rejected on three
counts, each independent of the others:

- One session holds one data point and no baseline, so it cannot separate a
  badly designed hook from one bad afternoon. That separation is precisely what
  ADR-0039 made load-bearing before a rule earns a mechanism.
- Its cost has the shape ADR-0027 rejected in the amendment quoted there: an
  unbounded reflective pass on every task, paid whether or not there is
  anything to find — while one of the proposal's own stated goals was reducing
  token consumption.
- Its output has nowhere to live. The step runs after the pull request is
  opened, at the session's deepest context and past the point where anything
  still gets reviewed, so its product is a chat message that dies with the
  session. A step that demands suggestions every task also reliably produces
  them, which is the failure `/quality-sweep` already had to forbid in so many
  words ("rather than inventing findings to fill one").

**A per-task friction log** — one appended line per concrete friction event (a
gate that failed for a tooling reason, a rule caught in review, a re-exploration
a checkpoint should have prevented), recorded without analysis and read by the
sweep as its evidence base. Not rejected on merit; deferred. It is worth its
per-task cost only if the process dimension turns out to be short of evidence,
and there is no way to know that before running one. See the revisit trigger.

**Leave the gap uncovered.** The status quo, and defensible on ADR-0027's own
logic — process changes must earn their place like any other. Rejected because
the two most-cited process ADRs here, ADR-0017's comment policy and ADR-0027
itself, were both found by the product owner noticing a pattern across pull
requests by hand. That is the work this dimension mechanizes, and leaving it
manual leaves it dependent on one person's memory across months of history.

## Consequences

- Good, because the marginal cost on the per-task path is zero. Nothing changes
  for `implement-task`, and a sweep gains one agent alongside four that already
  run in parallel.
- Good, because process findings now get the permanent IDs, MoSCoW grading and
  reviewed-as-a-PR treatment every other finding gets, instead of living in a
  chat transcript.
- Bad, because a sweep is product-owner-initiated and infrequent, so a process
  defect can now be findable for months before anyone looks. The rejected
  per-task step, for all its costs, would have looked every time.
- Bad, because this dimension audits the files describing how the auditing
  agent should itself work, which makes "the process is fine" the least
  trustworthy verdict it can return. The recurrence requirement bounds that but
  does not remove it.
- Neutral, because the evidence base is the merged history, so the dimension is
  only as good as what pull requests record — a gate skipped silently and never
  reported leaves nothing for it to find.
- **Revisit trigger:** a process dimension that reports nothing across two
  consecutive sweeps because the evidence had already scrolled out of the
  history it can read. That is the condition the deferred friction log exists
  for.

## Evidence

The coverage gap, as of 2026-08-30 and checkable from
`.claude/skills/quality-sweep/SKILL.md` before this change: its dimensions name
`docs/` and every `README.md` (documentation-quality), `docs/architecture.md`
and `docs/adr/` (architecture-quality), and `backend/src` and `frontend/`
(code-quality). `CLAUDE.md` falls under none of them — it is not inside `docs/`
and is not a `README.md`. Neither is `.claude/`, `scripts/` or the `Makefile`.

What that left unwatched, counted the same day and before this decision's own
edits: `CLAUDE.md` at 260 lines against
[ADR-0048](0048-what-survives-a-claude-md-bullet.md)'s stated 200-line budget,
5 skills, 1 path-scoped rule file, 3 checkers and 2 hooks. The budget overrun
is a worked example of the class: decidable from the files alone, invisible to
all four existing dimensions, and unnoticed by the compaction pass that had
just run against that budget — which is also why this ADR's own change to
`CLAUDE.md` had to be argued for line by line rather than waved through.
