# Task 06: Asking the feed what is new

- **Status:** needs-refinement
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
client's X is too old to answer. Plus, if [task 05](05-feed-delivery-decision.md)
chose a transport that holds a connection open, the endpoint that does so.

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

## Open questions

1. **Is the cursor opaque to the client, or a timestamp it can construct?** An
   opaque cursor can change shape later; a readable one invites a client to
   build its own and pin the implementation. A stream's `Last-Event-ID` has to
   carry whatever this answers.
2. **What happens when a client's cursor is older than the feed keeps?**
   [Task 02](02-feed-api.md)'s question 2 asks how far back the feed goes; this
   is its consequence — the server can answer with what it has, or tell the
   client to start over, and only the second lets a client know it has a hole.
3. **Is there a cap on one increment's size, and what does a client do when it
   hits the cap?** A page open overnight asks for a thousand events. Answering
   all of them and answering a capped page mean different things to a client
   that is prepending to a list.
4. **Does an increment ever correct a line the client already has?** A cellar
   made private while a visitor's page is open leaves a rendered line still
   carrying a link to it. Nothing in a purely additive contract can take that
   link away, and whether that matters is a privacy question rather than a
   technical one — the link keeps working only if the cellar is public, so the
   worst case is a stale link that 404s, but the *line* still says whose it is.
5. **Does the same contract serve a visitor who has been reading for an hour
   and one who just arrived?** Or does a client past some age reload the page
   rather than catch up?

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
- [ ] A malformed, forged or over-old cursor answers `problem+json` rather than
      an unbounded query or a stack trace — integration test
- [ ] The increment is bounded and its cap is observable to the caller —
      integration test
- [ ] The generated API client is regenerated and committed; the
      `api-client-drift` CI job passes
- [ ] `mvn clean verify` is green

## Notes

**None.**
