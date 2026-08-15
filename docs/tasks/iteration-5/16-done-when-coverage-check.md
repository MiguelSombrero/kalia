# Task 16: Check an iteration's `Done when` against the tasks meant to satisfy it

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

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

## Open questions

1. Where does a task declare its coverage — a `- **Covers:** DW-1, DW-3`
   metadata line in the task file, or an extra column in the iteration index
   table? The metadata line keeps the claim with the task and has one home;
   the index column is scannable and answers "what covers DW-2?" at a glance,
   but is a second copy of a fact the task file also holds.
2. What about tasks that advance no criterion by design? Iteration 5 has
   four: [07](07-drop-store-schemas.md) and
   [08](08-clear-backend-image-trivy-waivers.md) under `## Maintenance`, and
   tasks 15 and 16 under `## Process`. Explicit `none`, or exemption by
   grouping heading — and if by heading, that turns a presentational choice
   into a semantic one.
3. Does a `dropped` task's claim count toward coverage?
   [03](03-cellar-frontend.md) is dropped and its work moved to tasks 11–14,
   so counting it would hide a real gap. Presumed no — worth confirming.
4. Are iterations 6–8 retrofitted now, or does each get enumerated criteria
   when it is planned? Retrofitting means writing acceptance for iterations
   nobody has scoped yet; deferring means the checker is inert until then.
5. Identifier scheme and stability: `DW-1` or something else, unique within an
   iteration or across the project, and may an iteration's criteria be
   renumbered when one is added or dropped? (Permanence says no, which means
   a dropped criterion leaves a hole.)
6. Should the checker also fail an iteration whose `## Done when` carries no
   identifiers at all, or treat that as "not yet adopted" and skip it — the
   way an absent `iteration-N/` directory is skipped today?

## Acceptance criteria

- [ ] `scripts/check-tasks.mjs` gains the coverage rules and each new failure
      mode is **verified to fail** by introducing it alone and observing a
      distinct message — a criterion claimed by no live task, a task claiming
      a criterion that does not exist, and whichever of open question 6's two
      behaviours is chosen — following the discipline
      [ADR-0026](../../adr/0026-task-file-format.md)'s Evidence records for
      its own thirteen rules
- [ ] The automated task-format test `node scripts/check-tasks.mjs` is green
      against the real tree afterwards, with every templated iteration's
      criteria claimed
- [ ] Iteration 5's `## Done when` is enumerated into identified criteria that
      still read as outcomes to be run, not as a restatement of its task list
- [ ] Every live iteration-5 task declares its coverage, and the tasks that
      advance no criterion say so the way open question 2 settles
- [ ] [ADR-0026](../../adr/0026-task-file-format.md) is amended — not
      rewritten — with an `**Amended:**` metadata line, the new rule, and the
      honest limit that a claim is not proof; `node scripts/check-adrs.mjs`
      passes
- [ ] `docs/tasks/template.md` documents the enumerated `Done when` and the
      coverage declaration; `CLAUDE.md` and [docs/roadmap.md](../../roadmap.md)
      point at the check where they currently only assert the gate

## Notes

Adopted by [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md), from the
coverage pass of GitHub Spec Kit's `/speckit.analyze` — the one gap that
evaluation found which survives independently of whether Spec Kit itself is
used. Sibling of [task 15](15-refinement-clarification-taxonomy.md).
