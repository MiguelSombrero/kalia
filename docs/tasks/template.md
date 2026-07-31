# Task documentation templates

Two documents, checked as a matched pair by `scripts/check-tasks.mjs`: an
**iteration index** (`iteration-N.md`) and one **task file** per task
(`iteration-N/NN-slug.md`). Why this shape at all:
[ADR-0026](../adr/0026-task-file-format.md).

Both are described below in prose rather than given as skeletons to paste —
each heading says what belongs under it *and what belongs elsewhere*, because
the failure being prevented is a task quietly growing into a design document.

Iterations 0–4 predate this format and are deliberately left alone; the
checker only applies where a task directory exists. The same partial adoption
[ADR-0019](../adr/0019-adr-format-and-conventions.md) chose for ADRs, for the
same reason.

---

## The iteration index — `iteration-N.md`

```markdown
# Iteration N — Title

Goal: one sentence, what a user can do afterwards that they could not before.

## Done when

The iteration's acceptance, stated as criteria that can be *run*. Not a
summary of the tasks — the outcome their sum has to produce.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-N/01-slug.md) | Short title, matching the task file's H1 | done |
| [02](iteration-N/02-slug.md) | … | refined |
```

- **`## Done when` gets its own heading** so it can no longer end up buried
  mid-list, which is what happened in `iteration-4.md`.
- **The table is the only place per-task status lives.** The checker compares
  each row against its task file's `Status` and fails on a mismatch, and fails
  on a row with no file or a file with no row.
- **The Task column must match the task file's H1 title**, for the same reason
  the ADR index must match: two copies of a title drift silently.
- Grouping (`## Maintenance`, `## Backend`) is allowed but must be a real `##`
  heading, never bold text pretending to be one — iterations 3 and 4 each
  picked a different one of those.
- IDs are permanent and never reused. Order of work is the table's order, not
  the ID; a dropped task keeps its file and row with status `dropped`, exactly
  as retired findings keep their IDs in
  [quality-backlog.md](quality-backlog.md).
- Status uses the same vocabulary as the task files, so the table doubles as
  the answer to "what is ready to pick up" — anything still
  `needs-refinement` is not.

## The task file — `iteration-N/NN-slug.md`

```markdown
# Task NN: Title

- **Status:** needs-refinement | refined | in-progress | done | dropped
- **Iteration:** [N](../iteration-N.md)
- **PR:** #123
```

`Status` is a vocabulary token, nothing else. `PR` is added when the pull
request opens and is the link from intent to what actually shipped.

**A new task file is created as `needs-refinement`, and only the product
owner moves it to `refined`.** That transition is the gate on starting work:
it says a person has read the task and agrees it is ready, and because it
happens in a diff, it is visible in the PR that made it. An agent does not
set `refined` on its own behalf, and does not start a task that is not
`refined`.

The status carries the gate rather than the `Open questions` section,
because "no open questions" is satisfied just as easily by an author who
looked and found none as by one who never looked — and the second is the
failure this whole format exists to prevent.

The sections below are `##` headings *in the task file*; they appear here as
`###` only because this document carries both templates. They must appear in
the order given, and no other `##` heading may appear — the checker enforces
both. Omitting an optional section is fine; reordering is not.

A task file is the **request**: what is wanted, why now, and how anyone can
tell it worked. It is written before the work and frozen when the work lands.
It is not a record of what was built — that lives in the ADR (*why this
way*), `docs/architecture.md` (*shape*), and the READMEs (*how*), per
[ADR-0020](../adr/0020-documentation-roles.md). A task file that is edited
after completion to describe the implementation has become a second, drifting
copy of those documents.

### Why

The problem, and why it is worth doing now. A reader who stops here should
understand what is broken or missing without yet knowing what will be built.

No solution here. If a sentence describes an approach, it belongs in the ADR
this task produces, not in the request for it.

### Scope

What this task changes, in outcomes rather than file names. Enough that two
people would agree on whether something is in or out.

### Non-goals

Optional. What a reasonable reader would assume is included but is not — and
where it lives instead, as a link. This is the section that prevents the
scope-creep argument happening mid-review.

### Constraints

The decisions already made that bind this task: ADRs it must obey, conventions
it cannot break, and anything that fails *silently* if got wrong. Link them;
do not restate their reasoning.

`**None.**` is a valid entry and a useful one — it distinguishes a task with a
free hand from one whose author did not look.

### Open questions

Anything that must be settled with the product owner before work starts —
the agenda for the refinement conversation, written while the task is still
`needs-refinement`.

Ask about anything the product owner would want an opinion on, not only what
blocks the code: interface and interaction choices, wording a user will read,
what happens in the cases nobody has described yet. A question that turns out
to have an obvious answer costs one line; the one that was never asked costs
a rewrite.

`**None.**` only once they are answered. The checker requires it from
`refined` onward — but the gate on starting work is the **status**, not this
section, for the reason given above.

### Acceptance criteria

Checkboxes. Each states an **observable outcome and how it is verified** —
because "sign-out works" was true against `curl`, which does not enforce the
CSP that was actually blocking it in a browser.

- [ ] A signed-out user clicking Sign in is asked for credentials — verified
      in a browser, not with `curl`
- [ ] Playwright covers sign-in → sign-out → sign-in, and was confirmed to
      fail against the unfixed build

**At least one criterion must be an automated test**, and the checker enforces
it. Tests belong to the task that creates the behaviour; a separate "write the
tests" task is what let iteration 4's sign-in flow ship untested.

Prefer a criterion that would fail today. "Refactor is clean" cannot fail;
"`npm test` covers the contradictory-range case" can.

### Notes

Optional. Provenance — the quality-backlog ID, the bug report, the review
comment that prompted this — plus links worth having to hand. Not a scratchpad
for design.
