# Iteration 5.5 — Quality backlog

Goal: close every open finding in [the quality backlog](tasks/quality-backlog.md)
as of its 2026-08-23 triage, so iteration 6 starts against an empty one.

## Done when

Every MUST, SHOULD and COULD finding confirmed as part of this iteration's
2026-08-23 quality-backlog triage is closed — fixed, or (for the findings
flagged `[needs decision]`) resolved by the product owner and carried out —
and [`docs/tasks/quality-backlog.md`](tasks/quality-backlog.md)'s MUST/SHOULD/
COULD sections are empty, with every entry moved to Retired.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-5.5/01-documentation-accuracy-sweep.md) | Documentation accuracy and duplication sweep | done |
| [02](iteration-5.5/02-amend-csp-unsafe-inline-adr.md) | Re-affirm CSP `unsafe-inline` and close ADR-0016's revisit trigger | done |
| [03](iteration-5.5/03-fix-concurrent-first-sign-in-race.md) | Fix the concurrent-first-sign-in duplicate-user race | done |
| [04](iteration-5.5/04-catalog-search-usable-indexes.md) | Give catalog search usable indexes | done |
| [05](iteration-5.5/05-catalog-search-test-gaps.md) | Close catalog search test gaps | done |
| [06](iteration-5.5/06-catalog-module-edge-layering.md) | Route the catalog module's edges through its application layer | refined |
| [07](iteration-5.5/07-catalog-api-hardening.md) | Reject malformed sort parameters and paginate the brewery list | refined |
| [08](iteration-5.5/08-pin-springdoc-exposure-default.md) | Pin the springdoc production-exposure default with a test | refined |
| [09](iteration-5.5/09-validate-locale-switcher-input.md) | Validate the locale parsed from the pathname | refined |
| [10](iteration-5.5/10-detect-module-diagram-drift.md) | Detect backend module-diagram drift in CI | refined |

Numbered 5.5 rather than inserted as a renumbered 6, so iterations 6-8 (already
drafted ahead, under `docs/tasks/iteration-6/` through `iteration-8/`) don't
need touching. `scripts/check-tasks.mjs` accepts one optional decimal place in
an iteration directory name for exactly this case.

This iteration exists because the project is process-first: the docs in
`docs/` are the source of truth, and letting quality findings accumulate past
one iteration contradicts that as much as an untested feature would
(CLAUDE.md "Goals"). Every task above traces to one or more permanent
quality-backlog IDs, recorded in its own Notes section, so the backreference
survives the finding leaving `quality-backlog.md`.

Three findings confirmed against the backlog before this iteration was
planned turned out to be already resolved by already-merged iteration-5 work,
and are retired in `quality-backlog.md` without a task here: **SHOULD-11**
(`cellar/web` now exists — task 02 created it), **COULD-14** (the dangling
"task 01 question 6" reference in task 02 was already reworded), and
**COULD-15** (`AddBottleRequestDto` already bounds `quantity` with
`@Min`/`@Max`).

One finding, **SHOULD-10** (an emptied cellar entry outliving its last
bottle), is not a task here even though it's still live: iteration 6 already
has a more thorough, correctly-scoped task for it —
[`iteration-6/06-entry-with-no-bottles.md`](iteration-6/06-entry-with-no-bottles.md)
— deliberately placed ahead of that iteration's public-cellar-read task,
since a phantom zero-quantity entry is a worse thing to show a stranger than
to show its owner. Duplicating it here would fragment one decision across two
places. It's retired in `quality-backlog.md` as superseded by that task
rather than lifted into this one.

Four findings were tagged `[needs decision]` and resolved by the product
owner in the same conversation that planned this iteration, on 2026-08-23:
CSP `unsafe-inline` re-affirmed (task 02), the catalog module's edge-layering
gap fixed now rather than deferred (task 06), and the module-diagram-drift
gap closed by a generate-and-assert test rather than replacing the
hand-written diagram (task 10). Each task's Notes section records its
specific decision.

No task here depends on another within this iteration; they can be worked
in any order, and none of them depends on [iteration 6](iteration-6.md)
starting.
