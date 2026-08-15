# Task 16: Check an iteration's `Done when` against the tasks meant to satisfy it

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

`CLAUDE.md`'s iteration definition-of-done gate says an iteration's tasks
"must collectively guarantee the 'Done when', otherwise fix the tasks or the
criteria", and [docs/roadmap.md](../../roadmap.md) repeats it as a planning-
time check. Nothing verifies either. `scripts/check-tasks.mjs` checks that a
task file and its index row agree about title and status, that acceptance
criteria exist and include a test, and that a `refined` task holds no open
question — and stops there. Whether the iteration's tasks add up to its
acceptance is judged by whoever last read both, if anyone did.

This is the one place where an assertion in `CLAUDE.md` has no enforcement
behind it, in a repository whose own rule is that the enforcement mechanism
sets a rule's weight (`CLAUDE.md`, code-comment policy) and whose evidence is
that unenforced conventions drift: the ADR index drifted
silently until `check-adrs.mjs` existed
([ADR-0019](../../adr/0019-adr-format-and-conventions.md)), and the task
format drifted three separate ways before `check-tasks.mjs` did
([ADR-0026](../../adr/0026-task-file-format.md)).

Iteration 5 shows the shape of the gap already. Its `Done when` is one prose
sentence carrying three distinct outcomes — add a bottle with the dates it
carries, see the cellar as one row per beer opening onto its bottles, and know
nobody else can see it — against twelve live tasks in its main table. Which
task delivers the middle outcome cannot be answered without reading all
twelve.

## Scope

Make an iteration's acceptance and its tasks mechanically comparable, and
check it in CI:

- each templated iteration index's `## Done when` becomes enumerated criteria
  carrying stable identifiers, instead of prose;
- a task declares which criteria it advances;
- `scripts/check-tasks.mjs` fails when a criterion is claimed by no live task,
  or a task claims a criterion that does not exist.

[ADR-0026](../../adr/0026-task-file-format.md) is amended rather than joined
by a new ADR: it owns both the task-file format and the checker, and an
accepted ADR is amended, not rewritten (`CLAUDE.md`,
[ADR-0019](../../adr/0019-adr-format-and-conventions.md)) — so it gains an
`**Amended:**` metadata line and the new rule, not a rewrite.

## Non-goals

- Judging whether a task actually advances what it claims. The checker sees a
  declaration, not the work; that stays a review question, exactly as
  ADR-0026's Neutral consequences already say of acceptance criteria.
- Iterations 0–4. They have no `iteration-N/` directory, so they stay exempt
  by construction rather than by a list of exceptions — the same partial
  adoption ADR-0019 and ADR-0026 both chose.

## Constraints

- `scripts/check-tasks.mjs` stays dependency-free plain Node, so it runs in CI
  without an `npm install` — the constraint both checkers' headers state and
  the reason they are written the way they are.
- Identifiers are permanent and never reused, matching task IDs and
  `quality-backlog.md` findings ([ADR-0026](../../adr/0026-task-file-format.md)).
- One home per fact ([ADR-0020](../../adr/0020-documentation-roles.md)): the
  coverage declaration must live in exactly one place, since the whole point
  of `check-tasks.mjs` is that two copies of the same fact drift.
- `## Done when` gets its own heading and states acceptance "as criteria that
  can be *run*", not a summary of the tasks ([the template](../template.md)) —
  enumerating it must not turn it into a task list.
- The checker's failure messages follow the existing style: one line per
  failure, naming the file and what is wrong.
- A task declares coverage with a `- **Covers:** DW-1, DW-3` metadata line in
  the task file, alongside `Status`/`Iteration`/`PR` — not an extra column in
  the iteration index table, which would be a second copy of a fact the task
  file already holds (product-owner decision, 2026-08-15).
- A task that advances no criterion by design states so explicitly with
  `- **Covers:** none`, rather than being exempted by which grouping heading
  it sits under. Iteration 5 has four such tasks:
  [07](07-drop-store-schemas.md) and
  [08](08-clear-backend-image-trivy-waivers.md) under `## Maintenance`, and
  tasks 15 and 16 under `## Process` (product-owner decision, 2026-08-15).
- A `dropped` task's `Covers` claim does not count toward satisfying a
  criterion. [03](03-cellar-frontend.md) is dropped and its work moved to
  tasks 11–14, so those tasks carry its claims instead (product-owner
  decision, 2026-08-15).
- Iterations 6–8 are not retrofitted with enumerated criteria in this task;
  each gets them when someone deliberately migrates it, same as iteration 5
  does here (product-owner decision, 2026-08-15).
- Identifiers use the `DW-1`, `DW-2`… scheme, unique within an iteration (not
  across the project) and permanent once assigned — a dropped criterion
  leaves a hole rather than triggering a renumber, matching the task-ID and
  `quality-backlog.md` convention (product-owner decision, 2026-08-15).
- A templated iteration (one with an `iteration-N/` directory) whose
  `## Done when` carries no identifiers is **skipped** by the coverage rules,
  not failed — corrected 2026-08-15 after implementation found
  `docs/tasks/iteration-6/`, `iteration-7/` and `iteration-8/` already exist
  with real task files, all `needs-refinement`, prose `Done when`. The
  original answer ("failure, not skip") was given on the wrong premise that
  6–8 had no `iteration-N/` directory yet; enforcing it as written would have
  broken CI on all three the moment this ships, for reasons unrelated to any
  work in flight there — the exact retrofit-now outcome the bullet above
  already rejects. The coverage rules only apply once an iteration's
  `Done when` carries at least one `DW-N` id (product-owner decision,
  2026-08-15, reversing the same day's earlier answer).

## Open questions

**None.**

## Acceptance criteria

- [x] `scripts/check-tasks.mjs` gains the coverage rules and each new failure
      mode is **verified to fail** by introducing it alone and observing a
      distinct message — a `DW-N` criterion claimed by no live task, a task
      claiming a `DW-N` id that does not exist in its iteration's
      `Done when`, and a live task in an enumerated iteration with no
      `- **Covers:**` line at all — following the discipline
      [ADR-0026](../../adr/0026-task-file-format.md)'s Evidence records for
      its own thirteen rules
- [x] The automated task-format test `node scripts/check-tasks.mjs` is green
      against the real tree afterwards, with iteration 5's criteria claimed
      and iterations 6–8 left as prose, skipped by the coverage rules for
      carrying no `DW-N` identifiers
- [x] Iteration 5's `## Done when` is enumerated into identified criteria that
      still read as outcomes to be run, not as a restatement of its task list
- [x] Every live iteration-5 task declares its coverage with a
      `- **Covers:**` line — either the `DW-N` ids it advances, or `none` for
      a task that by design advances no criterion
- [x] [ADR-0026](../../adr/0026-task-file-format.md) is amended — not
      rewritten — with an `**Amended:**` metadata line, the new rule, and the
      honest limit that a claim is not proof; `node scripts/check-adrs.mjs`
      passes
- [x] `docs/tasks/template.md` documents the enumerated `Done when` and the
      coverage declaration; `CLAUDE.md` and [docs/roadmap.md](../../roadmap.md)
      point at the check where they currently only assert the gate

## Notes

Adopted by [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md), from the
coverage pass of GitHub Spec Kit's `/speckit.analyze` — the one gap that
evaluation found which survives independently of whether Spec Kit itself is
used. Sibling of [task 15](15-refinement-clarification-taxonomy.md).
