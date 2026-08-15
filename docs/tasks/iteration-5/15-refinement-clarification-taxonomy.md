# Task 15: Give refinement a fixed ambiguity taxonomy

- **Status:** done
- **Iteration:** [5](../iteration-5.md)

## Why

[The template](../template.md) tells a task author to ask about "anything the
product owner would want an opinion on, not only what blocks the code", and
names three examples. That is the right intent with no way to tell when it has
been met: whether a question list is complete depends entirely on what its
author happened to think of.

[ADR-0026](../../adr/0026-task-file-format.md) documents this failing in its
Evidence, on the very PR that proposed the format.
[Task 03](03-cellar-frontend.md) was written with
`Open questions: **None.**`, passed the checker, and the product owner
immediately raised a question that mattered — how the cellar page should look,
and their wish to take part in that decision. Two more tasks turned out to be
hiding real questions once someone looked again. ADR-0026's answer was to move
the gate to the status, so that a person has to agree the list is complete.
That fixes who decides, not what they are deciding about: the product owner
still has only the agent's list in front of them, and cannot see the category
nobody thought about.

[ADR-0038](../../adr/0038-in-repo-spec-driven-process.md) adopted a fixed
taxonomy as the missing half of that gate.

## Scope

Add a checklist of ambiguity categories to the guidance under
`## Open questions` in [docs/tasks/template.md](../template.md), so writing a
task means sweeping a fixed list rather than recalling one. The nine from
ADR-0038's Evidence are the base: functional scope and behaviour; domain and
data model; interaction and UX flow, including wording a user will read;
non-functional attributes — performance, security, accessibility,
localization; integrations and external dependencies; edge cases and failure
handling; constraints and trade-offs; terminology consistency; completion
signals. A tenth, specific to this project, is added alongside them: module
boundaries and which existing ADR, if any, an answer belongs in.

Documentation only. No change to `scripts/check-tasks.mjs`, and no change to
what a task file may contain.

## Non-goals

- Enforcing the taxonomy mechanically. A checker can see that a section
  exists, not that its author considered a category and found nothing —
  the same limit `check-tasks.mjs` already documents for acceptance criteria.
- Changing the `refined` gate, the status vocabulary, or where the refinement
  conversation is recorded. ADR-0026 settled all three, and
  [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md) explicitly
  declined the verbatim `Q: … → A: …` log that would change the last of them.

## Constraints

- No new `##` heading in the task template. `check-tasks.mjs` fails any
  heading outside its seven-token vocabulary, so the taxonomy is guidance
  under the existing `## Open questions`, not a section of its own.
- `**None.**` stays the required value from `refined` onward
  ([ADR-0026](../../adr/0026-task-file-format.md)) — the taxonomy tells an
  author what to ask before that point, and changes nothing about what the
  section reads afterwards.
- A task file is the request, not a design document
  ([ADR-0020](../../adr/0020-documentation-roles.md),
  [ADR-0026](../../adr/0026-task-file-format.md)). The taxonomy must not turn
  `Open questions` into a form to be filled in ten times.
- `docs/tasks/template.md` describes both templates in prose rather than as
  skeletons to paste, and says why. Whatever is added has to read that way too.
- The checklist is swept, not filled in: an author checks a task's
  `Open questions` against the taxonomy and writes a question only for the
  categories where sweeping surfaces one. No category needs an explicit
  "nothing here" line — that would turn the section into the ten-times form
  the constraint above already rules out.
- All nine of ADR-0038's categories stay, unchanged, plus the tenth named in
  Scope (module boundaries / which ADR an answer belongs in). None of the
  nine are dropped, even the ones — accessibility, localization — that are
  already settled by their own ADRs rather than decided per task; the
  taxonomy stays the fixed, project-agnostic list ADR-0038 adopted, with one
  addition rather than a curated subset.
- The taxonomy lives only in `docs/tasks/template.md`, not summarised in
  `CLAUDE.md`. `CLAUDE.md`'s licence to restate
  ([ADR-0020](../../adr/0020-documentation-roles.md)) is for what applies to
  every edit; refinement doesn't happen on every edit, so a ten-item list
  there would be unconditionally-loaded weight without a matching benefit.
- Applies to task files only. The iteration index's `Done when` is
  [task 16](16-done-when-coverage-check.md)'s subject, not this one's — the
  two changes stay on separate PRs.

## Open questions

**None.**

## Acceptance criteria

- [x] Applying the taxonomy to an existing `needs-refinement` task —
      [06](06-feature-public-surfaces.md) or [11](11-cellar-page.md), chosen
      before the template is edited — surfaces at least one question that task
      does not currently list, and the question is quoted in the PR
      description. If it surfaces none, the taxonomy has not earned its place
      and the task fails rather than shipping.
- [x] `docs/tasks/template.md` gains the checklist under `## Open questions`,
      introduces no new `##` heading, and keeps the prose form the rest of the
      document uses
- [x] The automated task-format test `node scripts/check-tasks.mjs` passes
      against every task file in the repository, and was confirmed to still
      fail on an unknown heading by adding one to a scratch task file and
      removing it again
- [x] `node scripts/check-adrs.mjs` passes

## Notes

Adopted by [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md), from
GitHub Spec Kit's `/speckit.clarify`; the nine categories and their wording
are recorded in that ADR's Evidence. Sibling of
[task 16](16-done-when-coverage-check.md), the other adoption from the same
evaluation.
