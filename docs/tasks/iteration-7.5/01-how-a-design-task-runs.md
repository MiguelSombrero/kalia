# Task 01: How a design task runs

- **Status:** needs-refinement
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

Whether the mechanism is a skill, a change to
[the task template](../template.md), or both, is part of this task — but the
product owner's stated preference is a skill, and the decision is recorded
either way.

## Non-goals

- Designing anything. This task produces the process the design tasks run
  under; the first design decision is [task 03](03-visual-identity.md).
- Reopening [ADR-0027](../../adr/0027-process-weight.md)'s process-weight rule.
  A design task is being given a procedure because prototyping genuinely has
  steps, not because process is being added for its own sake — and if the
  answer turns out to be "the existing skills cover it", that is a valid
  outcome of this task.
- A design-review gate on every PR. `/code-review` stays the single reviewer
  ([ADR-0027](../../adr/0027-process-weight.md)); this is about how a design
  *task* is run, not a new gate on unrelated work.

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
- [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md): skill-versus-
  template is a decision with a credible rejected alternative whose reasoning
  would not survive in the code, so it earns an ADR.

## Open questions

1. **Where does a prototype get looked at?** Four candidates, and they differ
   in what they cost and what they prove: a published Artifact the product
   owner opens in a browser; a `/design` sandbox route inside the Next app;
   static HTML committed under a scratch directory and served locally;
   screenshots posted in the pull request. The first three let the product
   owner interact; only the sandbox route proves the design works in the real
   app with real data.
2. **Does a prototype live in the repository or is it thrown away?** Keeping it
   gives a later task something to diff against and the ADR something to point
   at; keeping it also means committed code that nothing ships and nothing
   tests, which rots.
3. **How many directions before a choice?** Iteration 2 ran comparisons in
   pairs and triples. A number stated up front is what stops a task converging
   on the first idea and calling it a choice.
4. **How many rounds before the product owner is being asked too often?**
   Prototyping is a loop, and the loop's exit condition is the product owner's
   satisfaction — which means the honest question is how much of their time
   each of twelve tasks may take.
5. **Does one task both choose and implement, or do they split?** Choosing a
   palette is a decision task producing an ADR; applying it is production code
   with tests. Iteration 7 split decision from build
   ([task 05](../iteration-7/05-feed-delivery-decision.md)); whether a design
   task should is a real question, and the answer decides whether this
   iteration has 13 tasks or 26.
6. **What does "done" mean for a layout task?** "Looks good" cannot fail. The
   procedure needs to say what a design task's acceptance criteria are allowed
   to look like, and that has to be compatible with
   [ADR-0026](../../adr/0026-task-file-format.md)'s rule that a criterion
   states an observable outcome and how it is verified.
7. **Is the product owner's chosen direction recorded per task, or once?**
   Twelve ADRs for twelve tasks is noise; one ADR amended twelve times is a
   document rewritten rather than amended, which
   [ADR-0019](../../adr/0019-adr-format-and-conventions.md) forbids. There is a
   third answer — most tasks record nothing and inherit
   [task 03](03-visual-identity.md)'s ADR — and it is worth choosing on purpose.
8. **Does the procedure apply outside this iteration?** A skill written for a
   one-off sprint and a skill written for every future UI change are different
   documents, and the second has to earn its place in a context budget
   ([ADR-0035](../../adr/0035-agent-context-layout.md)).

## Acceptance criteria

- [ ] A written procedure exists that a session can follow from "this design
      task is refined" to "the product owner chose, and the choice is
      recorded", with numbered steps rather than advice
- [ ] An ADR records whether the mechanism is a skill, a template change or
      both, names the rejected alternatives, and states at least one Bad or
      Neutral consequence — passing `node scripts/check-adrs.mjs`
- [ ] The ADR states where a prototype is shown and whether it survives in the
      repository, so that no later task has to invent an answer
- [ ] The ADR names how a design task satisfies
      [ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task
      carries an automated test — including which of tasks 03–13 take the
      documented exception and which write real tests — without writing any of
      them here
- [ ] If the answer changes [the task template](../template.md), then
      `scripts/check-tasks.mjs` changes with it in the same PR and
      `node scripts/check-tasks.mjs` passes against every existing task file
- [ ] The procedure was run against one real task before this one closes —
      [task 02](02-design-audit-baseline.md) or
      [task 03](03-visual-identity.md) — and anything it got wrong is fixed
      rather than noted

## Notes

This task produces no production code. Whether it therefore takes
[ADR-0026](../../adr/0026-task-file-format.md)'s automated-test exception — the
one [iteration 7 task 05](../iteration-7/05-feed-delivery-decision.md),
[iteration 6 task 07](../iteration-6/07-cellar-domain-events.md) and
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md) each took —
depends on question 5's answer, which is why the criteria above name the
checker scripts rather than a test suite.

**A recommendation, not a decision.** A fifth skill beside `implement-task`,
`refine-task`, `refine-iteration` and `worktree`, leaving
[the task template](../template.md) untouched. The template holds the
*request*, and a design task's request is expressible in it already — this
file is the proof. What is missing is the procedure, and a procedure is what
the four existing skills are.
