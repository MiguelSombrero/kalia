# Task 19: Separate implementing from commenting

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

[Task 17](17-localize-the-code-comment-rule.md) puts the comment rule in
context at the moment code is written, and
[task 18](18-check-code-comments.md) fails the build on the part of it a
script can decide. Neither addresses why an agent that has read the rule still
writes the comment.

A comment is emitted in the same token stream as the code it annotates. There
is no point at which an agent looks at a comment it has just written and asks
ADR-0017's question — what does this carry that is nowhere else in the
repository? The rule is a test to apply, and the way the work is currently
sequenced gives it no moment to be applied in. That is a process shape
problem, not a knowledge problem, and it is the one the product owner
identified directly: implement first, comment second, as two separate passes.

There is a second, weaker reason to give the whole implementation lifecycle an
explicit order. `CLAUDE.md`'s `## Workflow` is eighteen unordered bullets
mixing gates, prohibitions and conventions. Every individual rule is there and
correct, but the sequence — what happens first, what happens before the PR
opens — has to be reconstructed by each session from a flat list. The gates
are already written; nothing states their order.

## Scope

Package the implementation lifecycle as an invocable skill whose steps are
ordered, with the comment pass as a step of its own.

- `.claude/skills/implement-task/SKILL.md`, sibling to `quality-sweep`.
- A numbered procedure from reading a refined task file to opening the pull
  request, in which implementation writes no comments and a later step adds
  the ones that earn their place.
- One line in `CLAUDE.md` making the skill the entry point for an
  implementation task.

## Non-goals

- Changing any gate. The doc-sync, code-review, dependency-confirmation and
  iteration-DoD gates keep their current meaning and their current homes; the
  skill orders them and links them. A skill that restates them would be the
  second rulebook [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md)
  rejected `constitution.md` for being.
- Rewriting or shrinking `CLAUDE.md`'s `## Workflow` section. It is tempting,
  since the file is 320 lines against a 200-line guidance, but the gates must
  still read correctly for a session in which the skill never fires. Moving
  them wholesale would duplicate rather than relocate. Worth its own task.
- Adding process weight. [ADR-0027](../../adr/0027-process-weight.md)'s
  default stands: implement directly, run `/code-review`, open the PR. This
  task writes that default down in order; it does not add a step to it.
- Anything for refinement, review response, or the quality sweep. This is the
  implementation lifecycle only.

## Constraints

- The skill adds **sequence, not content**. Each step is one line naming what
  happens plus a link to the rule's existing home. One home per fact
  ([ADR-0020](../../adr/0020-documentation-roles.md)) applies to a skill as
  much as to a document (product-owner decision, 2026-08-15).
- The skill must be model-invocable, so it does **not** carry
  `disable-model-invocation: true` — the opposite of `quality-sweep`, which is
  product-owner-initiated by deliberate decision. It also does not fork
  context: this is the main thread's own procedure, not an audit delegated to
  a subagent (product-owner decision, 2026-08-15).
- Implementation writes **no code comments at all**, and a later step adds
  them. The two steps are separate and ordered; the second re-reads the diff
  and applies ADR-0017's test to each candidate comment before writing it
  (product-owner decision, 2026-08-15).
- The comment pass ends by running `node scripts/check-comments.mjs`
  ([task 18](18-check-code-comments.md)), so the step has a mechanical close
  rather than ending on the agent's own judgement.
- Skill auto-invocation is decided by the model against the skill's
  `description`, with no deterministic trigger — verified against Claude Code's
  documentation, 2026-08-15. The single `CLAUDE.md` line is the mitigation and
  the checker from task 18 is the backstop; the skill's Consequences in the
  ADR must not claim more reliability than that.
- `.claude/skills/quality-sweep/SKILL.md` is the model for file layout,
  frontmatter shape and register.
- The skill states ADR-0027's default explicitly, so that invoking it is not
  read as licence to reach for heavier process.

## Open questions

**None.**

## Acceptance criteria

- [ ] `.claude/skills/implement-task/SKILL.md` exists with a numbered
      procedure covering task file to pull request, in which implementing and
      commenting are separate, ordered steps and the comment step closes by
      running `node scripts/check-comments.mjs`
- [ ] The skill is verified to be invocable and to actually trigger: a
      `claude -p` session given a refined task file invokes it without being
      told to, and the run is recorded with the Claude Code version, since
      auto-invocation is model-decided rather than guaranteed
- [ ] Every step in the skill links to the rule's existing home rather than
      restating it — verified by checking each step's text against
      `CLAUDE.md`, so the skill adds no rule that does not already exist
      somewhere
- [ ] `CLAUDE.md` gains one line making the skill the entry point for an
      implementation task, and the `## Workflow` gates are otherwise unchanged
- [ ] The two-phase order is exercised end to end on a real change: the
      implementation pass produces source with no comments, the comment pass
      adds only comments that pass ADR-0017's test, and
      `node scripts/check-comments.mjs` is green afterwards — this task's own
      later siblings are the first candidates
- [ ] `node scripts/check-tasks.mjs`, `node scripts/check-adrs.mjs`,
      `mvn clean verify` and `npm test` are all green

## Notes

From the product owner's own proposal on 2026-08-15 — a numbered list of how
to implement a task, with "implement, but do not write any code comments" and
"read what you implemented and add comments where they are needed" as separate
items. The proposal placed it in `docs/tasks/CLAUDE.md`; a skill was chosen
instead, because that file loads when a task file is read — the start of the
work rather than the moment code is written — and because holding workflow
rules there would be a second normative rulebook.

Sibling of [task 17](17-localize-the-code-comment-rule.md),
[task 18](18-check-code-comments.md) and
[task 20](20-resweep-code-comments.md).
