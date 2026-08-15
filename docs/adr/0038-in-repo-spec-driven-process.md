# ADR-0038: Keep the in-repo spec-driven process rather than adopt GitHub Spec Kit

- **Status:** accepted
- **Date:** 2026-08-15

## Context

This project's process is bespoke. Nothing outside the repository maintains
`docs/tasks/template.md`, `docs/adr/template.md`, the two `scripts/check-*.mjs`
checkers or `CLAUDE.md`'s workflow gates; every one of them was written here
and is kept here. That is a standing cost, and it is worth periodically asking
whether an externally maintained toolkit would carry it instead.

GitHub Spec Kit is the obvious candidate. It is an actively developed,
agent-agnostic implementation of specification-driven development, with the
same premise this project already runs on — that the specification is the
primary artifact and code is what it produces. It ships a specification
template, a planning template, a task template, a project "constitution", and
`/speckit.*` commands that drive an agent through them.

The question is whether it is a better home for what this repository already
does, and — if it is not — whether anything in it is worth taking anyway. The
question is asked now because iteration 5 is the first iteration written
entirely under the task-file format
([ADR-0026](0026-task-file-format.md)), so there is enough of this project's
own process in use to compare against something rather than to speculate about.

## Decision

**Kalia keeps its in-repo process and does not adopt GitHub Spec Kit, but
takes two ideas from it: a fixed ambiguity taxonomy for task refinement, and a
mechanical coverage check between an iteration's `Done when` criteria and its
tasks.**

What this covers, and what it does not:

- **The unit of work stays one task, one PR.** Spec Kit's unit is a feature
  that earns a specification, a plan, research notes, a data model, contracts
  and a task list. [ADR-0027](0027-process-weight.md) already decided this
  question for this repository in the other direction, and nothing in Spec Kit
  reopens it.
- **The documentation roles stay as [ADR-0020](0020-documentation-roles.md)
  set them.** ADRs record *why*, `docs/architecture.md` records *shape*,
  READMEs record *how*, and a task file records the *request* and is frozen
  when it lands. Spec Kit has no ADR equivalent, so adopting it would leave
  rejection reasoning — the most perishable thing this repository writes down
  — without a home.
- **Deterministic checks stay the enforcement mechanism.** `check-adrs.mjs`
  and `check-tasks.mjs` fail the build. Spec Kit's nearest equivalent,
  `/speckit.analyze`, is an advisory language-model pass over
  spec/plan/tasks/constitution that never compares any of them against code.
  It is not a replacement for either checker and is not adopted as one.
- **The `refined` gate stays a person's action, in a diff.** Spec Kit's
  clarification step is agent-run and capped at five agent-chosen questions.
  That is a useful prompt, not a substitute for the product owner moving a
  task to `refined`.
- **Two things are taken.** First, the ambiguity taxonomy: refinement sweeps a
  fixed list of categories instead of relying on what an agent happened to
  think of. Second, coverage: an iteration's `Done when` criteria and the
  tasks meant to satisfy them become mechanically comparable, so `CLAUDE.md`'s
  iteration definition-of-done gate is checked rather than merely asserted.
  Both are filed as tasks; this ADR decides that they are worth doing, not how.
- **Not taken, and deliberately so:** per-task plan and task-list artifacts, a
  `constitution.md` file, `/speckit.analyze` as a gate, `T001`/`[P]` task
  identifiers and parallel markers, and the `specify` CLI with its
  extension/preset/bundle stack.

## Alternatives considered

**Migrate the process to Spec Kit wholesale.** The strongest argument for it
is the standing maintenance cost above: the templates, the checkers and the
workflow gates would become someone else's problem, and 30-plus agent
integrations would come free. Rejected on three counts, each of which cuts
against this project's stated first goal that documentation and implementation
never drift. Spec Kit's durable artifact is one specification tree per
feature, and there is nothing that detects feature 8 contradicting feature 3
— `/speckit.analyze` cross-checks a feature's own documents and the
constitution, never a document against code, where this repository has two
checkers that fail CI and an ArchUnit suite that fails the build. It has no
place to record why an alternative was rejected: a constitution holds rules,
and a plan's complexity-tracking table justifies deviations from them, but
neither is the rejection record 38 ADRs here exist to hold. And its granularity
is wrong for the work: the two tasks this ADR files are a template edit and a
checker rule, each of which would acquire a specification, a plan, research
notes, a data model and a task list under Spec Kit.

**Hybrid — keep this repository's documents, drive them with `/speckit.*`
commands via a preset.** Spec Kit's preset mechanism overrides templates and
commands without adding capabilities, so in principle the existing task and
ADR templates could be served through `/speckit.specify` and friends.
Rejected because it buys nothing and costs a dependency: the commands' value
is the artifacts they produce, and once those are overridden back to this
repository's own, what remains is a Python CLI and a four-level template
resolution stack wrapped around markdown files that agents already read
directly. It would also pin this repository to Spec Kit's release cadence for
no functional gain, against a surface that is visibly still moving: the README
documents `/speckit.clarify` as having been named `/quizme`, and Spec Kit's
own methodology document still presents the workflow as three commands where
the README lists ten.

**Adopt `constitution.md` alone, leaving everything else.** Spec Kit's cleanest
single idea is separating normative project principles from agent operating
instructions — `CLAUDE.md` currently mixes goals, roles, gates, commands,
repository layout and environment notes in 316 lines. Rejected because the
separation already exists in a stronger form: the principles are the ADRs, and
`CLAUDE.md` is deliberately the one document loaded unconditionally, which
[ADR-0020](0020-documentation-roles.md) makes the sole licensed exception to
the one-home rule. A third normative document would be a second place for
rules to live, which is the failure that ADR exists to prevent.

**Adopt nothing; record the rejection and stop.** Reasonable, and the cheapest
outcome. Rejected because the comparison found one gap that is real and
independent of Spec Kit: `CLAUDE.md` asserts that an iteration's tasks "must
collectively guarantee the Done when" and nothing verifies it. A finding that
survives its source is worth acting on regardless of whether the source is
adopted.

## Consequences

- Good, because the process this repository already runs is now a decision
  rather than an accident — an alternative was examined in detail and the
  reasons for staying are written down.
- Good, because the iteration definition-of-done gate acquires a path to
  mechanical enforcement, closing the one gap the comparison found.
- Good, because refinement gets a completeness standard that does not depend
  on an agent's inventiveness on the day.
- Bad, because the process stays bespoke and unmaintained from outside. Every
  template, checker and gate here is this repository's to keep working, and
  none of Spec Kit's community extensions or presets apply.
- Bad, because this evaluation expires. Spec Kit is under active development,
  and the version compared against will not be the version anyone reads this
  next to.
- Neutral, because rejecting the toolkit is not a judgement on
  specification-driven development. The methodology is the one this repository
  already follows; the disagreement is about where knowledge lives and what
  enforces it.
- **Revisit trigger:** if Spec Kit gains a durable, cross-feature decision
  record with rejection reasoning (an ADR equivalent) and a check that
  compares specifications against code rather than only against each other,
  the two grounds this rejection rests on are gone and it should be reopened.

## Evidence

Read on 2026-08-15, at whatever `main` held that day — Spec Kit publishes no
version in the documents themselves, which is part of why this section pins a
date.

- Sources: the repository README, `https://github.github.io/spec-kit/reference/overview.html`,
  the methodology document `spec-driven.md`, and the four templates
  `spec-template.md`, `plan-template.md`, `tasks-template.md` and
  `constitution-template.md`, plus the `clarify.md` and `analyze.md` command
  definitions under `templates/commands/`.
- Commands present, all under a `/speckit.` prefix: `constitution`,
  `specify`, `clarify`, `plan`, `checklist`, `tasks`, `taskstoissues`,
  `analyze`, `implement`, `converge`.
- `/speckit.analyze` is documented as strictly read-only, cross-checking
  `spec.md`, `plan.md`, `tasks.md` and `constitution.md` across six detection
  passes (duplication, ambiguity, underspecification, constitution alignment,
  coverage gaps, inconsistency) at four severities. Its coverage pass — a
  requirement with no task, a task with no requirement — is the analogue this
  ADR adopts, and its scope is what makes it no substitute for
  `check-tasks.mjs`: no pass compares any document against code.
- `/speckit.clarify` scans nine ambiguity categories — functional scope and
  behaviour, domain and data model, interaction and UX flow, non-functional
  quality attributes, integration and external dependencies, edge cases and
  failure handling, constraints and trade-offs, terminology and consistency,
  completion signals — and is capped at five questions per session, asked one
  at a time, each with a recommended answer, logged into the specification as
  `Q: … → A: …` under a dated session heading. The nine categories are what
  this ADR adopts; the cap and the agent-chosen recommendations are what it
  does not.
- `spec-template.md` numbers requirements `FR-###` and success criteria
  `SC-###`, prioritises user stories P1–P3 with an "Independent Test" per
  story, and marks unresolved detail inline as
  `[NEEDS CLARIFICATION: …]`. `tasks-template.md` numbers tasks `T001…` with a
  `[P]` marker for parallel-safe work and a `US#` story tag.
  `plan-template.md` opens with a "Constitution Check" gate and closes with a
  "Complexity Tracking" table justifying any deviation.
- The evaluation covered `/speckit.converge`, documented as assessing an
  existing codebase against its spec, plan and tasks and appending remaining
  work. It is Spec Kit's brownfield path and it presupposes those three
  artifacts already exist, so it does not reduce the cost of a migration from
  a process that has none of them.
