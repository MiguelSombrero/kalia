# Task 01: Decide where catalog data comes from

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

Kalia's catalog is a Flyway migration written in iteration 1 — a fixed set of
beers that changes only when someone edits SQL and redeploys. That was the right
call then ([architecture.md §8](../../architecture.md)) and it is the ceiling on
everything now: a cellar can only hold beers someone thought to seed, and new
beers appear constantly.

There are three ways out and they are not variations on each other. Kalia can
call an external beer API and hold no catalog of its own; it can seed from an
open dataset once and own the result; or it can own its catalog outright and
grow it only from what users add. They differ in what breaks when the source
goes away, in what a user is allowed to change, and in whether
[task 02](02-add-beer-api.md) is contributing to Kalia's data or reconciling
against someone else's.

The decision has to come before either other task, because it is what they are
built on.

## Scope

Settling the question and recording it: which source, what Kalia stores itself,
what happens to the existing seed data, and what a user contribution means
under the chosen model.

## Non-goals

- Implementing any of it. Tasks [02](02-add-beer-api.md) and
  [03](03-add-beer-ui.md) build what this decides.
- Beer ratings. Sourcing a rating from an external platform is a related
  question with a different answer and lives in the [backlog](../backlog.md).
- Migrating existing cellars, if the decision invalidates seeded beer ids —
  that becomes its own task once there is a decision to size it against.

## Constraints

- The output is an ADR following [template.md](../../adr/template.md) with the
  rejected options and their costs recorded
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)); this passes
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test because it
  binds the two tasks behind it.
- Any external service is a new dependency and its selection is the product
  owner's, not an agent's — do not go registry-hunting
  ([CLAUDE.md](../../../CLAUDE.md)). Name the candidates and their licensing and
  rate limits; the choice is a question, not a recommendation to act on.
- Kalia never becomes a review platform ([README.md](../../../README.md)). A
  source that only offers ratings and reviews does not answer this question.

## Open questions

1. **Which of the three models?** External API as the live source of truth;
   one-time seed from an open dataset into Kalia's own catalog; or Kalia's own
   catalog grown by its users from here.
2. **If an external source is used, what happens when it is unavailable or
   changes its terms?** The catalog is the floor the whole app stands on, and a
   third party going away or starting to charge is not a hypothetical.
3. **Is a user allowed to edit a beer, or only add one?** Correcting a wrong ABV
   is the obvious next request, and under an external-source model it may not be
   possible at all.
4. **Does the seed data stay?** It gives every developer and every test a
   deterministic catalog. Under some models it becomes a set of duplicates
   waiting to happen.
5. **Are user-added beers visible to everyone immediately, or held for review?**
   Moderation is a product decision with a large implementation behind it, and
   an open catalog with no moderation is an open door.
6. **Does the source carry barcodes (EAN/UPC), and is that a criterion for
   choosing it?** Scanning the bottle in your hand is the one way of finding a
   beer that a phone can offer and a browser cannot
   ([backlog](../backlog.md) — mobile client), and it needs a barcode on the
   beer. The reason this belongs in *this* task rather than
   [task 02](02-add-beer-api.md): the column can be added by migration at any
   time, but nobody goes back and re-scans beers that already exist, so a
   source chosen without barcodes leaves the lookup permanently
   half-covered. That makes barcode coverage a way of telling the three models
   apart, not a field to specify later — and if the product owner does not want
   scanning at all, saying so here closes the question for good.

## Acceptance criteria

- [ ] An ADR records the chosen model, the two rejected ones and what each
      would have cost, and passes `node scripts/check-adrs.mjs`
- [ ] The ADR names what happens if the chosen source becomes unavailable —
      the question the seeded catalog never had to answer
- [ ] `docs/architecture.md` describes the catalog's data source and, where the
      decision changes it, the catalog's shape
- [ ] Tasks [02](02-add-beer-api.md) and [03](03-add-beer-ui.md) have their
      Scope and Open questions rewritten against the decision before either is
      refined — the decision is worthless if the tasks behind it still describe
      a different model
- [ ] Any test the decision invalidates is identified, and the seed migration's
      fate is stated explicitly rather than left to whoever implements task 02

## Notes

This task produces no production code and therefore **no new automated test**,
which is a deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task carries
one. The rule exists to stop behaviour shipping untested; there is no behaviour
here. The tests belong to tasks [02](02-add-beer-api.md) and
[03](03-add-beer-ui.md), which is also why this task's last criterion is about
naming the tests the decision breaks rather than writing any.

If the product owner would rather not carry that exception, the alternative is
to fold this decision into task 02 as its first deliverable. That was rejected
because it would put an ADR-shaped conversation inside a task someone has
already started coding.
