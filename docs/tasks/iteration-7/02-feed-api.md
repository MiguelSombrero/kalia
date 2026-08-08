# Task 02: Feed read API

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)

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

## Constraints

- The endpoint is public, so it is listed as such deliberately
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)) — default
  deny stays the rule.
- Whatever [task 01](01-feed-module.md) settles about private cellars is
  enforced here too, at read time, against the *current* visibility. A cellar
  made private after an event was recorded must not be linked or named beyond
  what that decision allows.
- Errors are RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)); Bean Validation
  bounds every request parameter, following the convention `catalog`'s
  controller applies.
- Pagination follows the existing envelope
  ([architecture.md §4](../../architecture.md)) if the feed is paginated at all
  — see question 1.

## Open questions

1. **Is the feed paginated, or a fixed recent-N?** A front page needs the most
   recent handful; infinite scrolling needs a cursor. Offset pagination over a
   feed that grows at the head is the classic wrong answer, so the choice
   matters more than it looks. Two things sharpen it. The cost of being wrong
   is asymmetric: the catalog's `page`/`size` envelope can be changed in
   lockstep with its single client, and a feed contract an independently
   released client depends on cannot ([backlog](../backlog.md) — mobile
   client). And if the answer is a cursor, the API then has **two** pagination
   shapes — which is defensible, because a stable search result set and a feed
   growing at the head are genuinely different problems, but it should be
   recorded in [architecture.md §4](../../architecture.md) as a deliberate
   split rather than left to look like an inconsistency someone should tidy.
2. **How far back does the feed go?** Everything ever, or a window? Nothing
   currently deletes events.
3. **What does a line carry?** Enough to render "X added a Y to their cellar"
   plus a link — but whether the beer links to the catalog, whether the user
   links to a profile, and whether the bottle's dates appear all change the
   response shape.
4. **Does a signed-in caller see anything different from a signed-out one** —
   their own additions marked, for instance, or their own excluded?

## Acceptance criteria

- [ ] A signed-out caller reads recent events newest-first — integration test
- [ ] **No event exposes anything about a cellar that is currently private**,
      including one that was public when the event was recorded — integration
      test flipping visibility between the write and the read, confirmed to
      fail against an implementation that resolves visibility at write time
- [ ] An event whose cellar is public carries what the page needs to link it,
      and one that is not carries nothing that would let a caller construct
      that link — integration test
- [ ] Request parameters are bounded and a hostile value is rejected with
      `problem+json` rather than producing an unbounded query — integration
      test
- [ ] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [ ] `mvn clean verify` is green

## Notes

**None.**
