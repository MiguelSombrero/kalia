# Iteration 6 — User profile and public cellars

Goal: a user can decide their cellar is public, and anyone can then browse it.

## Done when

User A sets their cellar public and user B — and a signed-out visitor — can
open it from a link and from A's profile. Set back to private, both get nothing,
and nothing about it leaks: not the beers, not the bottle count, not whether the
cellar exists at all beyond what A's profile already reveals.

## Tasks

| ID | Task | Status |
|---|---|---|
| [05](iteration-6/05-cellar-aggregate-owns-its-writes.md) | The cellar aggregate owns its writes | done |
| [06](iteration-6/06-entry-with-no-bottles.md) | What a cellar entry with no bottles is | done |
| [01](iteration-6/01-profile-and-visibility.md) | User profile and cellar visibility | done |
| [02](iteration-6/02-public-cellar-api.md) | Public cellar read API | done |
| [03](iteration-6/03-profile-page.md) | Profile page and the visibility control | done |
| [04](iteration-6/04-public-cellar-page.md) | Public cellar page | done |
| [07](iteration-6/07-cellar-domain-events.md) | Where a cellar's domain events are registered | done |
| [08](iteration-6/08-ubiquitous-language-glossary.md) | A ubiquitous language per bounded context | done |
| [09](iteration-6/09-batch-beer-lookup-for-cellar.md) | Batch beer lookup for the cellar page | done |
| [10](iteration-6/10-cellar-relative-date-precision.md) | Multi-unit precision for cellar relative dates | done |
| [11](iteration-6/11-e2e-suite-account-contention.md) | The e2e suite's specs contend for one Keycloak account | done |
| [12](iteration-6/12-dev-csp-blocks-react-eval.md) | The dev CSP blocks React's development-mode `eval()` | done |
| [13](iteration-6/13-bottle-removal-lost-on-navigation.md) | A bottle removal is undone by navigating away | done |
| [14](iteration-6/14-cellar-batch-lookup-chunking.md) | Chunk the cellar's batch beer lookup past 100 ids | done |

Depends on [iteration 5](iteration-5.md): there is nothing to make public until
the cellar exists.

Tasks 05–08 come from a Domain-Driven Design review of `backend/` on
2026-08-10 and do **not** serve this iteration's "Done when" — 01–04 still
cover it on their own. They are here because this is the iteration where each
one gets cheap or stops being cheap, and the table's order says so: 05 and 06
touch the cellar's write path and its entry lifetime, which task 02 becomes a
second caller of, so they run first; 07 is a decision iteration 7's first task
is built on, so it runs last, immediately before the iteration that needs it;
08 runs after 01–04 so the vocabulary they introduce is in the glossary from
the start, and after 07 so it can absorb that task's event-naming question.
The order is the recommendation, not a constraint — the ID is permanent, the
position is not ([template.md](template.md)).

This is the first iteration where getting it wrong exposes someone's data
rather than merely breaking a page, so tasks 01 and 02 carry the visibility
rule between them and task 02 owns proving it. Two ADRs written during
refinement bind that pair and the two pages built on them:
[ADR-0049](../adr/0049-profile-module-and-public-identity.md) decides what a
user is to other users, and
[ADR-0050](../adr/0050-public-cellar-addressing.md) decides how a public
cellar is addressed and what it may reveal when it is not public.

Task 06 gained a dependent: it lands before [task 02](iteration-6/02-public-cellar-api.md)
so the public read never has to decide what a zero-quantity entry is, and its
table position already reflects that.

The end-to-end journey in "Done when" is an acceptance criterion of
[task 04](iteration-6/04-public-cellar-page.md), the last task it depends on —
not a task of its own ([ADR-0026](../adr/0026-task-file-format.md)) and not
shared with [task 03](iteration-6/03-profile-page.md), whose browser coverage
stops at the visibility control.

[Task 09](iteration-6/09-batch-beer-lookup-for-cellar.md) also does not serve
this iteration's "Done when" — it is a code-review finding from iteration-5
task 11 (an N+1 backend-call pattern on the cellar page), riding along here
because it is not urgent enough to block that task but is real enough not to
sit in the general backlog indefinitely.

[Task 10](iteration-6/10-cellar-relative-date-precision.md) is the same
situation from the same review: a request to show cellar dates with
two-unit precision (iteration 5 task 11 shipped single-unit), deliberately
split out rather than fixed mid-PR since it revises that task's own spec'd
example text and needs its open questions settled first.

[Task 12](iteration-6/12-dev-csp-blocks-react-eval.md) does not serve this
iteration's "Done when" either — it is a bug found while testing the app in
`next dev` on 2026-09-03: `next.config.ts` serves one environment-blind CSP,
and `next dev` needs `'unsafe-eval'` for React's development-mode debugging,
so every dev page load logs a CSP violation. Predates this iteration; rides
along for the same reason as tasks 09 and 10.

[Task 11](iteration-6/11-e2e-suite-account-contention.md) does not serve this
iteration's "Done when" either — it is a test-infrastructure bug found while
running the e2e gate for [task 06](iteration-6/06-entry-with-no-bottles.md):
`add-to-cellar.spec.ts` and `sign-in-out.spec.ts` share one Keycloak account
under `fullyParallel: true`, so `make verify`'s e2e step is
non-deterministic locally while CI's `retries` hide it. It rides along here
because the flake is live now, not merged by this iteration; it is related to
but distinct from
[iteration-6.5 task 09](iteration-6.5/09-deterministic-test-accounts.md),
which covers cross-run realm state rather than one run's parallelism.

[Task 13](iteration-6/13-bottle-removal-lost-on-navigation.md) does not serve
this iteration's "Done when" either — it is a product-owner bug report against
the cellar page's undo-remove behaviour (iteration 5 task 14): the real
`DELETE` is delayed by a client-only timer, so reloading or navigating away
inside the undo window silently cancels the removal. It rides along here for
the same reason as tasks 09–12 — the defect is live on `dev` now, not
introduced by this iteration.

[Task 14](iteration-6/14-cellar-batch-lookup-chunking.md) does not serve this
iteration's "Done when" either — it is a `/code-review` finding on
[task 09](iteration-6/09-batch-beer-lookup-for-cellar.md)'s own
implementation: that task's single batch call breaks a cellar of more than
100 distinct beers, a narrow regression at the endpoint's id cap. It is
filed here as a follow-up so the boundary behaviour is decided explicitly
rather than left unhandled.
