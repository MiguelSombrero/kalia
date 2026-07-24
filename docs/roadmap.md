# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each numbered task in an
iteration file is meant to be **one issue / one PR**: implemented
test-first, reviewed, and merged before the next begins. Detailed task
lists live under [docs/tasks/](tasks/) — this file is the index plus the
process rules every iteration follows.

Priorities follow the beer-enthusiast side of the vision first
([ADR-0006](adr/0006-cellar-first.md)): catalog → frontend standards →
production-readiness → authentication → personal beer cellar. The store
flow (basket, ordering, payment) lives in [the backlog](tasks/backlog.md)
until the own-store vs. store-aggregator decision is made.

**Definition of done (every issue):**

- tests written and green; change verified by actually running it
- module boundaries verified (backend); lint/format clean
- **doc-sync check:** affected sections of `docs/` re-read and updated in the
  same PR — or explicitly confirmed accurate in the PR description
- completed task ticked off in its `docs/tasks/iteration-N.md` file

**Iteration DoD gate:** an iteration is complete only when its **"Done
when"** criteria (at the bottom of its `docs/tasks/iteration-N.md` file)
are verified *by running them*, criterion by criterion — not when its last
task is ticked. If a criterion is unmet, add tasks to the iteration until
it is. The same check runs at planning time: an iteration's tasks must
collectively cover its "Done when", or one of the two must be fixed.

## Iterations

| Iteration | Goal | Status |
|---|---|---|
| [0 — Walking skeleton](tasks/iteration-0.md) | Running end-to-end stack with CI-able test suites | ✅ Done |
| [1 — Beer catalog: browse & search](tasks/iteration-1.md) | Visitor can browse and search real (seeded) beers | ✅ Done |
| [2 — Frontend standards & UI design](tasks/iteration-2.md) | Conventions, localization, accessibility, a professional look | ✅ Done |
| [3 — Production-readiness foundations](tasks/iteration-3.md) | Logging, exception-handling, config and security conventions | 🚧 In progress |
| [4 — Authentication](tasks/iteration-4.md) | Users can sign in via Keycloak | ⬜ Todo |
| [5 — Personal beer cellar](tasks/iteration-5.md) | Signed-in users maintain the beers they own | ⬜ Todo |

Unscheduled work: [Backlog](tasks/backlog.md) · [Quality backlog](tasks/quality-backlog.md)
