# Task 06: An admin approves or rejects a suggestion, and one event says so

- **Status:** refined
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
transaction; exactly one `SuggestionReviewed` event per decision is published,
whether or not the brewery was new, with the payload
[ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)
lists, and one review record is written. A suggestion already decided, or
decided concurrently, is answered `409` as the ADR decides. The
public views reflect the decision as
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
and [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
state.

## Non-goals

- Editing before approving — [task 07](07-an-admin-edits-a-suggestion-before-approving-it.md).
- Anything consuming the event — [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md).
- Retiring `make moderate` — [task 08](08-the-sql-moderation-script-is-retired.md).

## Constraints

- Builds on [task 05](05-an-admin-reads-the-review-queue.md)'s admin API and
  follows [task 13](13-domain-time-from-the-clock-and-one-read-per-duplicate.md).
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
- What each outcome does, the shared-brewery rule, the reason list, the review
  record, the event and the `409` are decided in ADR-0102
  ([task 02](02-decision-what-reviewing-a-suggestion-does.md)), as is keeping
  the public cellar's read-time exclusion; this file restates none of it.
- The event has no `suggestionId`: a suggestion's id is its beer's, so `beerId`
  names it (ADR-0102). Where task 02's own text says "the suggestion's id", the
  ADR is the record.
- The review record's deciding-admin column is nullable: account deletion
  removes a deciding admin's id from a record and keeps the record
  ([task 15](15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)),
  so a later migration must not be needed for it. Deleting an account is not
  built here.
- A suggestion decided before this iteration, by the script, has no review
  record: its `409` says how it was decided and carries no time.
- Approve and reject are each an operation under
  `/api/v1/admin/suggestions`, shaped by [architecture §4](../../architecture.md#4-api-design)'s
  conventions and recorded in the spec by this task. The reason belongs to the
  rejection alone, so an approval accepts none.
- A beer that is no suggestion — an imported one, or an unknown id — answers
  `404`, as [task 05](05-an-admin-reads-the-review-queue.md)'s read does.

**Decided at refinement, 2026-11-04** (product owner; the second pass on
2026-11-05 checked this file against ADR-0102 and changed no decision):

- **A decision answers `200` with the suggestion as decided** — the outcome,
  when, and the values decided — as the cellar's writes answer with what they
  made. A bare `204` was rejected.

## Open questions

**None.**

## Acceptance criteria

- [ ] An integration test approves a suggestion with an existing brewery and
      one with a new brewery, and each is then visible to another user in
      search, details and the brewery list
- [ ] An integration test rejects each kind, and both the beer and the new
      brewery are withheld afterwards, with no row deleted
- [ ] A pending brewery shared by two suggestions is approved with the first
      approval, stays pending when one is rejected while the other waits, and
      is rejected with the last — integration test
- [ ] A rejection without a reason from ADR-0102's list, or with a code outside
      it, answers `400`, and an approval that carries a reason answers `400` —
      tests
- [ ] Exactly one event is published per decision, with or without a new
      brewery, carrying `eventId`, `contributorId`, `beerId`, the outcome, the
      beer's name as decided, `edited`, and `occurredAt` from the `Clock`, and
      for a rejection its reason code — `@ApplicationModuleTest` scenario
- [ ] Two concurrent decisions on one suggestion (two threads released
      together) leave exactly one decision, one review record and one event,
      and the loser answers `409` `problem+json` saying how it was decided,
      never `500` — integration test
- [ ] Deciding a suggestion that is already decided answers the same `409`
      with the outcome, whether it was approved or rejected, and with when it
      was decided where a review record exists — integration test; an unknown
      id and an imported beer answer `404`
- [ ] Two suggestions sharing a pending brewery, rejected concurrently, leave
      the brewery `REJECTED` and not stranded `PENDING` — integration test,
      confirmed to fail without the row locks
- [ ] A decision writes one review record with who decided, when, the outcome
      and, for a rejection, the reason code, which the event also carries; the
      deciding admin's id is nullable — integration test and schema check
- [ ] The beer and its new brewery change status in one transaction: a failure
      after the beer's update leaves both `PENDING` — test
- [ ] A non-admin's decision is refused — integration test
- [ ] The committed spec carries the operations with their `400`, `403`, `404`
      and `409` responses; ADR-0091 and `docs/architecture.md` describe the
      application path, and §4's reason for the public cellar's read-time
      exclusion no longer says it is waiting on a path that can publish
      events — ADR-0102's reason is that the cellar read is joined with the
      catalog, so no copy exists to keep current
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "approve … as is,
or reject it", with "only one event per beer addition, no matter if the
brewery was also new".
