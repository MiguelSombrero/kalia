# Task 18: A contributor whose suggestions are rejected cannot refill the review queue without end

- **Status:** dropped
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

**Dropped 2026-11-15 by the product owner at refinement: no limit on
rejected suggestions.** Kalia is a hobby project and need not prepare for
every case. A limit can be added if Kalia ever becomes a production app, so
neither this task nor its finding (SHOULD-80) is kept open for it. The rest
of this file is the request as it stood.

A contributor may have at most 20 suggestions waiting for review
(`ContributionService.MAX_PENDING_ENTRIES`,
[ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)).
A rejected suggestion leaves that count. So a contributor whose 20 suggestions
are all rejected can immediately suggest 20 more, with no end. Registration is
open, so one person with several accounts multiplies this. The cost lands on
the one admin who reviews the queue by hand.

At iteration 10.5's refinement the product owner chose not to limit
rejections yet. Two things since then make it more pressing:
[iteration 14](../iteration-14.md) makes a suggestion one scan away on a
phone, and a public build of the app would put the form in front of
strangers. A limit set now is a server rule that every client honours. Added
after the app ships, it is a new error the installed apps do not know how to
show ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

## Scope

The shape of the limit is decided and built: rejections count toward the cap
for a period, a cooldown starts after several rejections, or there is no
limit. Each client shows the answer that results. If the decision is "none",
the task records why and closes with that change alone.

## Non-goals

- Rate limiting by client address, which the edge already does
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
- Blocking or banning an account, or an admin action against a contributor.

## Constraints

- **The API is additive only while an app is installed** (ADR-0093). A new
  refusal is a new documented response, and a client falls back on a status
  it does not know
  ([iteration 11 task 18](../iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- **An anticipated refusal gets its documented answer**, not a `500`
  ([iteration 11 task 20](../iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md)).
- **Domain time comes from the injected `Clock`**
  ([iteration 10.5 task 13](../iteration-10.5/13-domain-time-from-the-clock-and-one-read-per-duplicate.md)).
  A period or a cooldown is tested by moving the clock.
- Two adds by one contributor are serialised by an advisory lock before the
  count is read. A new count is read under that same lock.

## Open questions

- **Functional scope.** Which shape: rejections count toward the 20 for a
  period, a cooldown after several rejections in a row, or no limit? And with
  what numbers? (SHOULD-80, `[needs decision]`.)
- **Interaction and UX.** What does the contributor read when the limit
  refuses them, and does it say when they can suggest again? In English and
  Finnish.
- **Domain.** Does a suggestion the admin approved after correcting it count
  as a rejection?
- **Module boundaries.** Is this an amendment to ADR-0102, or a new ADR?

## Acceptance criteria

- [ ] A backend integration test shows the chosen limit refusing a suggestion
      with its documented status, and the same suggestion accepted once the
      clock moves past the period or cooldown. It failed before the change.
      If refinement chooses "none", ADR-0102 records the reason instead
- [ ] The committed OpenAPI spec lists the new response, and the
      breaking-diff check passes
- [ ] The web's add-a-beer form shows the refusal's message, verified by a
      test
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-80
(`[needs decision]`). Its other half, the SQL moderation script, was done in
[iteration 10.5 task 08](../iteration-10.5/08-the-sql-moderation-script-is-retired.md).
