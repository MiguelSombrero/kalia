# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each task is meant to be **one
issue / one PR**: refined, implemented test-first, reviewed, and merged
before the next begins. Detailed task lists live under
[docs/tasks/](tasks/) — this file is the index plus the process rules every
iteration follows.

From iteration 5 on, each task is its own file under
`docs/tasks/iteration-N/`, written to [the template](tasks/template.md) and
carrying its own acceptance criteria
([ADR-0026](adr/0026-task-file-format.md)). A task starts at
`needs-refinement` and only the product owner moves it to `refined`; nothing
is picked up before that. Iterations 0–4 keep the older single-file form.

Priorities follow the [vision](../README.md)'s own dependency order. The
catalog came first because you have to find a beer before you can own one, and
authentication before the cellar because the cellar is per-user data
([ADR-0006](adr/0006-cellar-first.md)). From there: the cellar itself, then
what makes it social — a profile and a cellar you can choose to make public,
then a feed of what people are putting in theirs — then a catalog that grows
past its seed data. Everything further out is in
[the backlog](tasks/backlog.md).

**Definition of done (every issue):**

- every acceptance criterion in the task file checked off, each verified the
  way the criterion says
- tests written and green; change verified by actually running it
- module boundaries verified (backend by Spring Modulith and ArchUnit,
  frontend by ESLint); lint/format clean
- **doc-sync check:** affected sections of `docs/` re-read and updated in the
  same PR — or explicitly confirmed accurate in the PR description
- task status set to `done` in the task file and its iteration index

**Iteration DoD gate:** see [CLAUDE.md](../CLAUDE.md)'s workflow bullet of the
same name; `scripts/check-tasks.mjs` checks its planning-time half
mechanically ([ADR-0026](adr/0026-task-file-format.md)).

## Iterations

| Iteration | Goal | Status |
|---|---|---|
| [0 — Walking skeleton](tasks/iteration-0.md) | Running end-to-end stack with CI-able test suites | ✅ Done |
| [1 — Beer catalog: browse & search](tasks/iteration-1.md) | Visitor can browse and search real (seeded) beers | ✅ Done |
| [2 — Frontend standards & UI design](tasks/iteration-2.md) | Conventions, localization, accessibility, a professional look | ✅ Done |
| [3 — Production-readiness foundations](tasks/iteration-3.md) | Logging, exception-handling, config and security conventions | ✅ Done |
| [4 — Authentication](tasks/iteration-4.md) | Users can sign in via Keycloak | ✅ Done |
| [5 — Personal beer cellar](tasks/iteration-5.md) | Signed-in users record the bottles they own | ✅ Done |
| [5.5 — Quality backlog](tasks/iteration-5.5.md) | The quality backlog is closed | ⬜ Todo |
| [6 — User profile and public cellars](tasks/iteration-6.md) | A cellar can be made public and browsed by anyone | ⬜ Todo |
| [7 — Front page activity feed](tasks/iteration-7.md) | The front page shows what people add to their cellars | ⬜ Todo |
| [8 — Catalog beyond seed data](tasks/iteration-8.md) | Users add the beers they cannot find | ⬜ Todo |

Unscheduled work: [Backlog](tasks/backlog.md) · [Quality backlog](tasks/quality-backlog.md)
