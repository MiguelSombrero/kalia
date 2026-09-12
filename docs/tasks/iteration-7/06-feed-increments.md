# Task 06: Asking the feed what is new

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-5

## Why

A page that is already showing events needs to ask a different question from
the one [task 02](02-feed-api.md) answers. "The most recent twenty" re-sends
what the visitor is looking at; "everything since the last thing I have" is
what a live page asks, and both transports on the table in
[task 05](05-feed-delivery-decision.md) need it. A poll sends it on every
request. A stream sends it once on connect and again after every reconnect —
that is exactly what server-sent events' `Last-Event-ID` header is for.

It looks like one parameter and it is not, because **ordering a feed by time
is wrong in a way that loses events silently.** Two bottles added concurrently
get two `occurredAt` values, and the transaction with the *earlier* timestamp
may commit *later*. A client that asks "what is new since T" in between takes
a cursor past the later timestamp and never sees the earlier row, which
committed after it looked. Nothing errors, nothing retries, and no test that
inserts its fixtures one at a time can reproduce it. The same flaw makes
offset pagination wrong over a list that grows at the head, which
[task 02](02-feed-api.md)'s first open question is already about — so the two
questions have one answer, and it is a property of how an event is ordered
rather than of either endpoint.

## Scope

The contract for "events after X": what X is, the total order it is a position
in, how far back it may reach, what bounds it, and what the server says when a
client's X is too old to answer. [Task 05](05-feed-delivery-decision.md) chose
polling, so there is **no connection-holding endpoint to build** — this task is
a cursor parameter, an ordering guarantee and the bounds around them.

## Non-goals

- The browser side — [task 07](07-live-front-page.md).
- Choosing the transport — [task 05](05-feed-delivery-decision.md) does, and
  this task's shape depends on the answer. If that answer is polling, this task
  is a parameter and an ordering guarantee; if it is a stream, it is those plus
  an endpoint.
- A second pagination vocabulary. Whatever this settles is the same contract
  [task 02](02-feed-api.md) serves its first page with, not a parallel one.

## Constraints

- **The visibility rule applies to an increment exactly as to a first page.**
  This is the trap the task exists to name: the first-page path gets the
  private-cellar rule right because [task 02](02-feed-api.md) is written about
  it, and the increment path is written afterwards, separately, by someone who
  has already solved that problem once. Two paths, one rule, and the second one
  fails open.
- Whatever [task 09](09-feed-and-private-cellars.md) decides about private
  cellars binds this endpoint identically.
- Request parameters are bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)) and errors are
  RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)) — including the
  malformed or forged cursor, which is caller-supplied input like any other.
- The contract is the one a second client would inherit and could not be
  redeployed in lockstep with ([backlog](../backlog.md) — mobile client), which
  is the same reason [task 02](02-feed-api.md) treats its pagination shape as
  more expensive to get wrong than the catalog's.
- The generated OpenAPI client is regenerated and committed
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- Whatever column the order is taken on is the column the query is indexed on;
  a feed read newest-first over a growing table without one degrades quietly
  as it fills.

**Decided 2026-09-12 by the product owner.** This section is the single home
for the ordering and cursor contract; [task 01](01-feed-module.md) creates the
column and index it names and [task 02](02-feed-api.md) serves its first page.

- **The cursor is opaque to the client** (question 1): a string it round-trips
  without parsing, so the ordering mechanism can change later without a
  contract change — which matters because the contract is the one a second,
  independently released client would inherit
  ([backlog](../backlog.md) — mobile client). A readable timestamp was rejected
  for inviting a client to construct its own and pin the implementation, and
  for inviting exactly the ordering bug below into every client that tries.
- **Offset `page`/`size` is rejected** for this endpoint and for
  [task 02](02-feed-api.md)'s first page. The API therefore carries two
  pagination shapes, recorded in
  [architecture.md §4](../../architecture.md) as a deliberate split.
- **The total order must survive commit reordering, and a `BIGSERIAL` alone
  does not.** The Why states the flaw for timestamps; a sequence has it too,
  because ids are allocated at insert and become visible at commit, so a
  transaction holding a lower id can commit after a reader has taken a cursor
  past it. **[Task 05](05-feed-delivery-decision.md)'s 60-second latency budget
  makes the cheapest fix viable** — serving only events settled for longer than
  a short lag, so in-flight transactions have committed — but the mechanism is
  the implementer's choice, constrained by the acceptance criterion below
  rather than mandated here.
- **A cursor older than the served window answers *start over*** (question 2),
  not a partial result: only that lets a client know it has a hole. The window
  is 30 days ([task 05](05-feed-delivery-decision.md)). The same answer serves
  question 5 — a visitor whose tab has been open longer than the window reloads
  rather than catching up — and a malformed or forged cursor is
  `problem+json` like any other rejected input.
- **An increment is capped at the same page size as the first page, and the
  response says whether it was truncated** (question 3), so a client prepending
  to a list can tell "that was all" from "ask again". A page open overnight
  asks repeatedly rather than receiving a thousand events at once. **Recorded
  by the agent during refinement rather than asked** — it follows from the
  bounded-parameter convention
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)) and from the first
  page and the increment being one contract.
- **The contract is additive: it never retracts a line** (question 4). A cellar
  going private while a visitor's page is open leaves the rendered line on
  screen until they reload, with a link that 404s from that moment — accepted
  and recorded as a Neutral consequence in
  [task 09](09-feed-and-private-cellars.md)'s decision, not solved here. A
  retraction list and a whole-list replacement were both considered and
  rejected for the contract they would cost.
- **Polling pauses while the tab is hidden and catches up on focus**
  ([task 05](05-feed-delivery-decision.md)), so the catch-up path this contract
  serves is exercised on every tab focus rather than only after a network
  failure — which is what makes it worth testing properly.

## Open questions

**None.**

## Acceptance criteria

- [ ] A client that has seen event X receives every event recorded after it,
      exactly once per request, newest-first — integration test
- [ ] **An event whose transaction commits after a later-timestamped one is
      still delivered** — integration test that commits two events out of
      timestamp order with a cursor taken between the commits, confirmed to
      fail against an ordering taken on `occurredAt` alone
- [ ] An increment enforces the private-cellar rule identically to the first
      page — integration test that runs the same visibility assertion against
      both paths, so the second cannot silently diverge
- [ ] A malformed or forged cursor answers `problem+json` rather than an
      unbounded query or a stack trace, and a cursor older than the 30-day
      window answers *start over* rather than a partial result — integration
      test covering both, since only the second lets a client know it has a
      hole
- [ ] The increment is capped and the response tells the caller it was
      truncated, so a client can distinguish "that was all" from "ask again" —
      integration test
- [ ] The cursor is opaque: a test constructs a plausible-looking cursor by
      hand and it is rejected rather than honoured, so no client can come to
      depend on its shape
- [ ] The generated API client is regenerated and committed; the
      `api-client-drift` CI job passes
- [ ] `mvn clean verify` is green

## Notes

**None.**
