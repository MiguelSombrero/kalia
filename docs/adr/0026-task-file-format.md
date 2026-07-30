# ADR-0026: One file per task, with acceptance criteria that include tests

- **Status:** accepted
- **Date:** 2026-07-30

## Context

A task in `docs/tasks/` is a line in a numbered list. Acceptance exists once
per iteration, in the `**Done when:**` line — no task states what would make
*it* done. Tests are sometimes a task of their own.

Iteration 4 paid for all three. Its task 1 said "Keycloak + Redis in
docker-compose", leaving which cache, whether state persists, and what the
realm contains to be settled mid-task. Its task 2 shipped a sign-out the
browser refused to run, because nothing said how the flow had to be verified
and it was verified with a tool that does not enforce the relevant policy. Its
E2E coverage was task 4, so task 2 could be ticked with no regression test at
all — while `docs/roadmap.md` has said "implemented test-first" throughout.

Two facts make this structural rather than a lapse in discipline. Tasks have
already outgrown the list-item form, unstructured: one is a forty-line bug
analysis, another twenty-three lines of design rationale. And `docs/tasks/`
is the one documentation area [ADR-0020](0020-documentation-roles.md) never
assigned a kind of fact, so nothing says what belongs in a task or how big it
may get.

## Decision

**Each task gets its own file under `docs/tasks/iteration-N/`, following a
normative template whose acceptance criteria must include at least one
automated test; the iteration file becomes an index.**

- A task file is the **request** — why, scope, constraints, open questions,
  acceptance criteria — written before work starts and frozen when it lands.
  It is not a record of what was built: that stays in the ADR (*why this
  way*), `docs/architecture.md` (*shape*) and the READMEs (*how*). This is the
  role `docs/tasks/` was missing in ADR-0020's scheme, and it is what stops a
  task file becoming a second, drifting copy of those documents.
- **Acceptance criteria state an observable outcome and how it is verified.**
  At least one must be an automated test, so tests belong to the task that
  creates the behaviour and a standalone "write the tests" task never exists.
- **Tasks are refined just in time** — immediately before work starts, not at
  iteration planning. `Open questions` must be resolved before a task leaves
  `refined`, which is the gate the ad-hoc clarifying rounds were standing in
  for.
- **Identifiers are permanent and never reused**, including for dropped tasks,
  matching the convention `docs/tasks/quality-backlog.md` adopted after sweep-
  scoped numbering collided.
- Adoption is **new work only**. Iterations 0–4 keep their current form.

`scripts/check-tasks.mjs` enforces the mechanical parts; `docs/tasks/template.md`
is the normative skeleton.

## Alternatives considered

**Keep one file per iteration, add the template inside each list item.**
Cheapest, and it would deliver acceptance criteria — the substance of the
change — without moving anything. Rejected on arithmetic: `iteration-3.md` is
already 98 lines and `iteration-4.md` 91, at roughly one line per task. A
template of five-plus sections per task puts a nine-task iteration past 400
lines in a file whose whole value is being scannable. The two iterations that
already tried to carry per-task detail are exactly the two that grew
non-monotonic numbering, two rival grouping mechanisms, and a `Done when` line
stranded above three later tasks.

**Per-task files, but keep the numbering in the directory name as originally
proposed** (`docs/tasks/iteration4/task1-….md`). Rejected for a reason found
by counting: fourteen references across the repo point at
`docs/tasks/iteration-N.md`, including `docker-compose.yml`, ADR-0025,
`quality-backlog.md` and five phrasings in `CLAUDE.md`. Keeping the iteration
file as the index at its existing path breaks none of them.

**GitHub Issues instead of files in the repo.** Native templates, status and
PR linking, none of it to build. Rejected because this project's first goal is
that documentation and implementation never drift, resolved *in the same PR* —
an issue cannot be updated in the commit that makes it true, and a worktree
running offline cannot read one. The repo is the source of truth.

**Template as a written convention, no checker.** Rejected on this repo's own
evidence: the ADR index drifted silently until `check-adrs.mjs` existed, and
`CLAUDE.md` already holds that the enforcement mechanism sets a rule's weight.

## Consequences

- Good, because the questions that were being discovered mid-implementation
  now have a place and a gate that stops work until they are answered.
- Good, because "done" acquires a mechanical floor: a task cannot be marked
  done with an unchecked criterion, and cannot have no test.
- Good, because per-task files give each task its own history — when a
  criterion changed, and in which PR — and stop parallel worktrees colliding
  in one iteration file.
- Bad, because `docs/tasks/` is now deliberately inconsistent: iterations 0–4
  in the old shape, 5 onward in the new. The same price
  [ADR-0019](0019-adr-format-and-conventions.md) accepted for ADRs, decaying
  as new iterations are written rather than needing a migration.
- Bad, because a task file is one more document that can be wrong. Freezing it
  at completion bounds the damage — it becomes a historical record of what was
  asked, which cannot drift from a present it no longer claims to describe.
- Neutral, because the checker verifies structure, not judgement. It cannot
  tell a criterion that would fail today from one that cannot fail; that stays
  a review question, as `check-adrs.mjs` likewise cannot tell whether a
  Decision section opens with the decision.
- **Revisit trigger:** if a task file is written and its `Acceptance criteria`
  are all unfalsifiable restatements of the title, the section is not carrying
  its weight and the gap belongs in review guidance or a sharper check rather
  than a longer template.

## Evidence

Measured over `docs/tasks/` and the repo's cross-references on 2026-07-30.

- **No task in any of the six iteration files has acceptance criteria.**
  Acceptance is iteration-level only, in a single `Done when`.
- **Tasks already exceed the list-item form.** `iteration-3.md:35-75` is a
  40-line bug report with its own bold pseudo-headings (`**Reproduce:**`,
  `**Not the cause**`); `iteration-4.md:28-50` is 23 lines including "Likely
  shape:" and "Evidence this is real, not theoretical:".
- **Numbering no longer implies order.** `iteration-3.md` runs 1–10, then 12,
  13, 14, then 11; `iteration-4.md` runs 1, 2, 3, 4, 8, 9, `Done when`, 5, 6,
  7 — so its `Done when` sits above three tasks.
- **Grouping split.** `iteration-3.md:8,16,23,33` groups with bold text;
  `iteration-4.md:54` uses a real `##` heading. Adjacent files, rival
  conventions, neither specified anywhere.
- **`Done when` drifted** from one sentence (iterations 0, 1, 2, 5) to 22
  lines carrying ten semicolon-separated criteria (`iteration-3.md:77-98`).
- **Bare task references are already dangling.** ADR-0019 requires task
  references be links, "never bare numbers … a dangling reference in waiting";
  roughly twenty violate it across ADRs, `architecture.md`, `README.md` and
  three source files, and a plan document still cites "Iteration 2.5", an
  iteration renamed to 3.
- **Fourteen references point at `docs/tasks/iteration-N.md`**, which is why
  the index keeps that exact path.
- **The checker was verified to fail, not assumed to.** Eleven violations were
  introduced one at a time and each produced a distinct failure: unknown
  heading, headings out of canonical order, non-vocabulary status, missing
  required section, no acceptance checkbox, no test-shaped criterion, `done`
  with unchecked criteria, non-`refined` status with an unresolved open
  question, task file with no index row, index row with no file, and index
  title or status disagreeing with the file.
