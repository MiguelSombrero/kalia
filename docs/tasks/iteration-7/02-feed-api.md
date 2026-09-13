# Task 02: Feed read API

- **Status:** done
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-2, DW-3

## Why

[Task 01](01-feed-module.md) records events; nothing can read them. This task
exposes the feed over HTTP so the front page has something to render.

It is a read endpoint, but not a simple one: it is the first endpoint that
returns data belonging to *many* users at once, so the visibility rule
[iteration 6](../iteration-6.md) established has to hold across a collection
rather than a single owner. One row leaking is the whole rule broken.

## Scope

An endpoint returning recent feed events newest-first, available to signed-in
and signed-out callers alike, carrying enough for the front page to render each
line and link a public cellar.

## Non-goals

- Any UI — [task 03](03-front-page-feed.md).
- A per-user or followed-users feed. One global feed; personalisation needs a
  follow model that does not exist.
- Writing anything. Events are recorded by [task 01](01-feed-module.md)'s event
  consumer, never by an HTTP call.
- Asking what is new *since* a point the caller already holds —
  [task 06](06-feed-increments.md). This task serves the first page; that one
  serves every page after it, over the same ordering.
- Building the reads that turn an event's ids into a name and a beer —
  [task 04](04-feed-line-composition.md). This endpoint consumes them.

## Constraints

- The endpoint is public, so it is listed as such deliberately
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)) — default
  deny stays the rule.
- Whatever [task 09](09-feed-and-private-cellars.md) settles about private
  cellars is enforced here, at read time, against the *current* visibility. A
  cellar made private after an event was recorded must not be linked or named
  beyond what that decision allows.
- A line's contents come from [task 04](04-feed-line-composition.md)'s reads,
  resolved for the whole page at once rather than per line — twenty lines must
  not be twenty lookups each of two modules
  ([ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)
  requires reading current data back, not how many times).
- Errors are RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)); Bean Validation
  bounds every request parameter, following the convention `catalog`'s
  controller applies.
- Pagination does **not** follow the catalog's `page`/`size` envelope — see
  the cursor decision below and [task 06](06-feed-increments.md).

**Decided 2026-09-12 by the product owner.** The privacy rule lives in
[task 09](09-feed-and-private-cellars.md)'s Constraints, the storage shape in
[task 01](01-feed-module.md)'s, line assembly in
[task 04](04-feed-line-composition.md)'s and the cursor in
[task 06](06-feed-increments.md)'s; none is restated here
([ADR-0020](../../adr/0020-documentation-roles.md)). What binds this endpoint:

- **Only events whose owner's cellar is currently public are served**, and that
  filter is this endpoint's, applied at read time
  ([task 09](09-feed-and-private-cellars.md)). It is the single correctness
  rule for the whole feature, so the test below is the one that matters most in
  the iteration.
- **The response carries a whole line, not ids** — username, beer name,
  brewery, bottle count, vintage, and the instant — assembled by the backend
  ([task 04](04-feed-line-composition.md)). The username is also what the
  page's link to `/cellars/{username}` is built from
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
- **This endpoint and [task 06](06-feed-increments.md)'s increment are one
  contract, not two.** Both serve the same opaque cursor over the same total
  order; this task serves the first page of it. Question 1's two shapes are
  therefore one shape, and [architecture.md §4](../../architecture.md) records
  the cursor form beside the catalog's `page`/`size` as a **deliberate split** —
  a stable search result set and a list growing at the head are different
  problems — rather than leaving it to look like an inconsistency to tidy.
- **The feed serves a 30-day window** (question 2), over a table that keeps
  every row ([task 05](05-feed-delivery-decision.md)). Every query is bounded
  and there is no deletion job.
- **The response is identical for every caller, signed in or out** (question
  4). No "you added this" marker and no exclusion of the caller's own
  additions — so the response is wholly cacheable later, and there is no
  caller-dependent branch on a public path
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)'s reasoning applies
  here too).
- **A line whose beer or person no longer resolves is dropped**
  ([task 04](04-feed-line-composition.md)), which means a page may return fewer
  lines than asked for without that being an error — the client pages on the
  cursor, never on the count.

## Open questions

**None.**

## Acceptance criteria

- [x] A signed-out caller reads recent events newest-first — integration test
- [x] **No event exposes anything about a cellar that is currently private**,
      including one that was public when the event was recorded — integration
      test flipping visibility between the write and the read, confirmed to
      fail against an implementation that resolves visibility at write time
- [x] An event whose owner's cellar is not public is absent from the response
      entirely — not present-but-stripped — including one recorded while that
      cellar was public; integration test asserting the response carries no
      field naming the owner, since a stripped-in-the-UI answer is not a
      privacy answer
- [x] A signed-in caller and a signed-out caller receive byte-identical
      responses for the same cursor — integration test, confirmed to fail
      against an implementation that marks the caller's own events
- [x] Request parameters are bounded and a hostile value is rejected with
      `problem+json` rather than producing an unbounded query — integration
      test
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [x] `mvn clean verify` is green

## Notes

**None.**
