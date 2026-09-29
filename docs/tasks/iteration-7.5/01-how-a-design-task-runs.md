# Task 01: How a design task runs

- **Status:** in-progress
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-1

## Why

The other twelve tasks in this iteration share a shape the repository has no
procedure for. [`implement-task`](../../../.claude/skills/) assumes the outcome
is known: a `refined` task file says what to build, and the skill orders the
gates around building it. A design task inverts that — the outcome is the thing
being searched for, and the work is to produce alternatives, put them in front
of the product owner, and converge. "Write the code that makes the page look
right" is not a step anyone can take.

This has been done here exactly once, by hand.
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence section
records that the palette "was chosen with the product owner through iterative
mockups, not proposed whole", and lists the passes it took: palette comparison
→ restrained/whitespace pass → background-tint comparison → primary-colour
assignment → font-pairing comparison. That is a record of what happened, not a
procedure anyone could repeat. It worked because one conversation held the
whole thing. Twelve tasks across twelve sessions is where an undocumented
process becomes twelve different processes.

There is also nothing to show a prototype *on*. Kalia has no sandbox route, no
mockup convention and no place a variant can live without being shipped, and
the product owner does not run the code to look at it. Every design task in
this iteration hits that on its first step, so it is worth solving once.

## Scope

One written procedure for running a design task end to end, and the mechanism
that carries it: how directions are explored, how many are produced before
anything is chosen, how they reach the product owner, how a choice is recorded
so a later task inherits it, and where the line falls between choosing a design
and implementing it.

Concretely, per the Constraints below: a fifth skill, `design-task`; an
optional `Kind` metadata line in [the task template](../template.md) that marks
a task as a design task, enforced by `scripts/check-tasks.mjs` and covered by a
fixture test of its own; the marker applied to this iteration's design tasks;
and the ADR recording why.

## Non-goals

- Designing anything. This task produces the process the design tasks run
  under; the first design decision is [task 03](03-visual-identity.md).
- Reopening [ADR-0027](../../adr/0027-process-weight.md)'s process-weight rule.
  A design task is being given a procedure because prototyping genuinely has
  steps, not because process is being added for its own sake.
- A design-review gate on every PR. `/code-review` stays the single reviewer
  ([ADR-0027](../../adr/0027-process-weight.md)); this is about how a design
  *task* is run, not a new gate on unrelated work.
- A component catalogue or sandbox route inside the app. Prototypes live
  outside the repository (below); whether a rendered catalogue is worth having
  on its own is [task 12](12-do-we-need-a-design-system.md)'s question 3.

## Constraints

- [ADR-0026](../../adr/0026-task-file-format.md): a task file is the
  **request**, written before the work and frozen at completion. Whatever this
  task decides, the chosen design cannot end up recorded in the task file that
  asked for it — it belongs in an ADR or `docs/architecture.md`
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- The four skills in `.claude/skills/` set the shape: each orders gates that
  already exist into a numbered procedure, and **none of them changes a gate**
  (`CLAUDE.md`). A fifth that quietly relaxed the doc-sync, code-review or
  acceptance-criteria gates would be a different kind of thing.
- `scripts/check-tasks.mjs` enforces the task file's section set and order, and
  requires at least one acceptance criterion mentioning an automated test. A
  template change means a checker change in the same PR.
- [ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md): refinement
  is batched per iteration, so this iteration's twelve remaining tasks are
  refined in one conversation. Whatever this task produces has to survive being
  applied twelve times, not once.
- [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md): the mechanism is a
  decision with credible rejected alternatives whose reasoning would not survive
  in the code, so it earns an ADR.

Decided with the product owner in refinement, 2026-09-29:

- **Mechanism: a skill plus a template marker.** A fifth skill, `design-task`,
  covers a design task from "refined" to "the product owner chose, and the
  choice is recorded", then hands off to `implement-task` for the build rather
  than restating its gates. The template gains an optional
  `- **Kind:** design` metadata line, beside `Status`/`Iteration`/`PR`/`Covers`;
  `design` is its only value, and no line means an ordinary task. When the
  line is present, `check-tasks.mjs` fails unless at least one acceptance
  criterion mentions built alternatives. The rule is covered by a fixture test,
  `scripts/check-tasks.test.mjs`, following
  [`check-glossary.test.mjs`](../../../scripts/check-glossary.test.mjs)'s
  precedent — so this task writes a real test and does not take
  [ADR-0026](../../adr/0026-task-file-format.md)'s no-test exception.
- **General, not sprint-only.** The skill is for any task whose outcome is a
  visual choice, including ones after this iteration. Until it is invoked it
  costs only its description line
  ([ADR-0035](../../adr/0035-agent-context-layout.md)).
- **Where a direction is looked at.** Directions are built as self-contained
  HTML mockups carrying real sample data — Finnish strings included
  ([ADR-0011](../../adr/0011-i18next-localization.md)) — and published as
  private claude.ai Artifacts the product owner opens side by side. The chosen
  direction is then confirmed in the real app, shown in the desktop app's
  browser pane, with screenshots at both agreed widths in the pull request.
  Because a future session may not have the Artifact tool, the skill names a
  fallback that shows the same HTML file in the browser pane. `CLAUDE.md`
  already holds that a plugin which may be absent is never a required step,
  and the same reasoning applies to a harness tool.
- **Prototypes do not survive in the repository.** No mockup code is
  committed; the ADR's description of each direction is the record.
- **One task both chooses and builds, in one pull request.** The iteration stays
  at thirteen tasks, and tasks 03–10 are already written that way.
- **Three directions in the first round; rounds are open after that.** The
  product owner decides when they are satisfied and when the process ends —
  the skill sets no cap. A blend of directions is allowed only as a new
  direction that is built and shown, never assembled after the choice, so the
  direction chosen is always one the product owner actually saw.
- **Every design-kind task writes its own ADR**: the directions shown, the one
  chosen, and why the others were rejected. Standing intent — what later tasks
  are held against — goes where [task 14](14-where-design-intent-lives.md)
  decides, not into those ADRs.
- **What "done" means for a design task** is the shape tasks 06–10 already use:
  a criterion that the product owner chose from built alternatives, plus
  behavioural tests of what shipped — skeletons matching the new layout,
  `@axe-core/playwright` scans at both agreed widths, keyboard-only tests
  where something became interactive.
- **The procedure is proven by [task 03](03-visual-identity.md), not here.**
  Task 03 is its first real use and carries a criterion to fix whatever the
  skill got wrong, in its own pull request. This task closes when the skill, the
  marker and the ADR land.

## Open questions

**None.**

## Acceptance criteria

- [x] `.claude/skills/design-task/SKILL.md` exists as a numbered procedure from
      "this design task is refined" to "the product owner chose, and the choice
      is recorded in an ADR", handing off to `implement-task` for the build
      without restating or changing any of its gates
- [x] An ADR records the mechanism — skill plus marker — and names the rejected
      alternatives (skill only, template only, a sandbox route, committed static
      HTML, screenshots only, choosing and building as separate tasks), with at
      least one Bad or Neutral consequence, passing
      `node scripts/check-adrs.mjs`
- [x] The ADR states where a prototype is shown, that it does not survive in the
      repository, the directions-and-rounds rule, and that each design task
      writes its own ADR — so that no later task has to invent an answer
- [x] The ADR names how a design task satisfies
      [ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task
      carries an automated test, and which of tasks 02–14 take the documented
      exception, without writing any of their tests here
- [x] [The task template](../template.md) documents the `Kind` line, and
      [ADR-0026](../../adr/0026-task-file-format.md) is amended with a pointer
      to the new ADR, the way its `Covers` amendment was made
- [x] `scripts/check-tasks.test.mjs` fails on a design task with no
      alternatives criterion and on an unknown `Kind` value, and passes an
      ordinary task with no `Kind` line — each confirmed to fail before the
      rule existed — and runs in `make verify` and in CI
- [x] Tasks [03](03-visual-identity.md),
      [04](04-imagery-iconography-and-the-mark.md), [06](06-page-shell.md),
      [07](07-front-page-layout.md), [08](08-catalog-layout.md),
      [09](09-cellar-layout.md) and [10](10-profile-and-sign-up-layout.md)
      carry `- **Kind:** design`, and `node scripts/check-tasks.mjs` passes
      against every existing task file
- [ ] `CLAUDE.md` names `design-task` alongside the other skills and stays
      under 200 lines
- [x] `make verify` is green

## Notes

**Written as a recommendation before the decision; the product owner decided
differently on one point on 2026-09-29, so the Constraints above are now the
decision and this paragraph is kept as the reasoning that led there.** The
recommendation was a fifth skill with [the task template](../template.md) left
untouched. The reasoning: the template holds the *request*, a design task's
request is already expressible in it, and what was missing was the procedure.
The product owner took the skill and added the marker, so that a design task
cannot be written without its "the product owner chose" criterion — enforced
rather than remembered, at the cost of a template and checker change.

The original criterion — that the procedure be run against task 02 or 03
before this task closes — was replaced in refinement. Task 02 is an audit and
has no alternatives to choose between, and task 03 follows tasks 02 and 14 and
needs this skill merged before it can use it.
