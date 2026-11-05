# Task 06: An admin approves or rejects a suggestion, and one event says so

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2, DW-3

## Why

The point of the admin API is deciding. Approving makes a suggested beer — and
the brewery suggested with it — visible to everyone; rejecting withholds both
for good. Today that happens for all of a contributor's rows at once, in SQL,
with no event, so nothing downstream can react: not a notification, not the
public cellar's read-time exclusion that exists only because "`make moderate`
… publishes nothing a copy could follow"
([architecture §4](../../architecture.md#4-api-design)).

## Scope

An admin approves a suggestion as it is, or rejects it, through the admin API.
The beer and a brewery new with it change status together, in one
transaction; exactly one domain event per decision is published, whether or not
the brewery was new, with the name and payload
[task 02](02-decision-what-reviewing-a-suggestion-does.md) chose. A suggestion
already decided, or decided concurrently, is answered as task 02 chose. The
public views reflect the decision as
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
and [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
state.

## Non-goals

- Editing before approving — [task 07](07-an-admin-edits-a-suggestion-before-approving-it.md).
- Anything consuming the event — [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md).
- Retiring `make moderate` — [task 08](08-the-sql-moderation-script-is-retired.md).

## Constraints

- **This task cannot be refined before [task 02](02-decision-what-reviewing-a-suggestion-does.md)
  is done**, and builds on [task 05](05-an-admin-reads-the-review-queue.md)'s
  admin API.
- Events are registered on the aggregate root and drained on `save`, never
  published from a service
  ([ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md));
  each carries its own `eventId` for idempotent consumers
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md)).
- Timestamps come from the application's injected `Clock`
  ([architecture §3](../../architecture.md#3-backend-modules));
  [task 13](13-domain-time-from-the-clock-and-one-read-per-duplicate.md) moves
  `Beer` and `Brewery` onto it first.
- No catalog row is deleted (ADR-0091), and a decided row leaves the duplicate
  key as ADR-0091 states.
- A concurrent decision must not answer `500`; a retry on a constraint
  violation follows [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)
  where it applies.
- Every response is `problem+json` and in the spec; the operations are new
  paths, so the change is additive
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- What each outcome does, the shared-brewery rule, the reason list, the event
  and the `409` are [task 02](02-decision-what-reviewing-a-suggestion-does.md)'s
  decisions, as is keeping the public cellar's read-time exclusion.

**Decided at refinement, 2026-11-04** (product owner):

- **A decision answers `200` with the suggestion as decided** — the outcome,
  when, and the values decided — as the cellar's writes answer with what they
  made. A bare `204` was rejected.

## Open questions

Every question was answered at refinement on 2026-11-04 — task 02's in its
Constraints, this task's above. The task moves to `refined` once task 02's ADR is accepted
and this file is checked against it.

## Acceptance criteria

- [ ] An integration test approves a suggestion with an existing brewery and
      one with a new brewery, and each is then visible to another user in
      search, details and the brewery list
- [ ] An integration test rejects each kind, and both the beer and the new
      brewery are withheld afterwards, with no row deleted
- [ ] A pending brewery shared by two suggestions is approved with the first
      approval, stays pending when one is rejected while the other waits, and
      is rejected with the last — integration test
- [ ] A rejection without a reason from task 02's list answers `400` — test
- [ ] Exactly one event is published per decision, with or without a new
      brewery, carrying what task 02 chose — `@ApplicationModuleTest` scenario
- [ ] Two concurrent decisions on one suggestion (two threads released
      together) leave exactly one decision, one review record and one event,
      and the loser answers `409` `problem+json` saying how it was decided,
      never `500` — integration test
- [ ] Deciding a suggestion that is already decided answers the same `409`
      with the outcome, whether it was approved or rejected — integration test
- [ ] Two suggestions sharing a pending brewery, rejected concurrently, leave
      the brewery `REJECTED` and not stranded `PENDING` — integration test,
      confirmed to fail without the row locks
- [ ] A decision writes one review record with who decided, when, the outcome
      and, for a rejection, the reason code, which the event also carries —
      integration test
- [ ] The beer and its new brewery change status in one transaction: a failure
      after the beer's update leaves both `PENDING` — test
- [ ] A non-admin's decision is refused — integration test
- [ ] The committed spec carries the operations; ADR-0091 and
      `docs/architecture.md` describe the application path
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "approve … as is,
or reject it", with "only one event per beer addition, no matter if the
brewery was also new".
