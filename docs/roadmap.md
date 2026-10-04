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
is picked up before that. Refinement takes an iteration at a time rather than
a task at a time — its questions are merged into one agenda and answered in
one conversation ([ADR-0047](adr/0047-refinement-is-batched-per-iteration.md)). Iterations 0–4 keep the older single-file form.

Priorities follow the [vision](../README.md)'s own dependency order. The
catalog came first because you have to find a beer before you can own one, and
authentication before the cellar because the cellar is per-user data
([ADR-0006](adr/0006-cellar-first.md)). From there: the cellar itself, then
what makes it social — a profile and a cellar you can choose to make public,
then a feed of what people are putting in theirs — then a catalog that grows
past its seed data. Everything further out is in
[the backlog](tasks/backlog.md).

From iteration 9 on, **mobile is Kalia's primary UI**: an Expo app with a
design of its own rather than the web's, built on the foundations iteration 9
lays and then feature by feature in the same dependency order — catalog,
cellar, social — before what only a phone can do. The web keeps working and is
not held at feature parity. The plan adds no cost: the app runs on the product
owner's own iPhone and on simulators against the local stack, and everything
that needs paid accounts or hosting is parked in
[the backlog](tasks/backlog.md#mobile-client) until that changes. Iterations
9–14 list planned tasks as one line each; their task files are written at
refinement.

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
| [5.5 — Quality backlog](tasks/iteration-5.5.md) | The quality backlog is closed | ✅ Done |
| [6 — User profile and public cellars](tasks/iteration-6.md) | A cellar can be made public and browsed by anyone | ✅ Done |
| [6.5 — Sign-up](tasks/iteration-6.5.md) | Someone other than the author can create an account | ✅ Done |
| [7 — Front page activity feed](tasks/iteration-7.md) | The front page shows what people add to their cellars, live | ✅ Done |
| [7.5 — Design sprint](tasks/iteration-7.5.md) | Kalia looks designed rather than defaulted | ⬜ Todo |
| [8 — Catalog beyond seed data](tasks/iteration-8.md) | Users add the beers they cannot find | ⬜ Todo |
| [9 — Mobile foundations](tasks/iteration-9.md) | An Expo app signs in and shows real data on both simulators | ⬜ Todo |
| [10 — Kalia on your own iPhone](tasks/iteration-10.md) | The app runs on a real iPhone at no cost | ⬜ Todo |
| [11 — Mobile design language](tasks/iteration-11.md) | A mobile design of Kalia's own, proven on the catalog | ⬜ Todo |
| [12 — The cellar in your pocket](tasks/iteration-12.md) | The cellar, natively, readable with no signal | ⬜ Todo |
| [13 — Social on mobile](tasks/iteration-13.md) | Feed, profile and public cellars on the phone | ⬜ Todo |
| [14 — Scan the bottle in your hand](tasks/iteration-14.md) | A barcode puts a beer in the cellar | ⬜ Todo |

Unscheduled work: [Backlog](tasks/backlog.md) · [Quality backlog](tasks/quality-backlog.md)
