# Task 07: The front page's feed reaches public lines past private ones

- **Status:** refined
- **Iteration:** [8](../iteration-8.md)

## Why

**The front page can say "Nothing here yet" while public activity exists.**
`FeedService.readRecent` reads `size+1` rows and only afterwards drops the
lines that belong to private cellars. Cellars are private by default, so when
the newest 21 lines are all private, the first page comes back empty, though
it carries a `nextCursor`. `FeedList.tsx:134` offers "load more" only when
`lines.length > 0`, and `:174-177` then renders the empty state. The visitor
cannot reach the older public lines at all.
[ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md) accepts a short
page; an entirely empty one is a different thing. This is Kalia's landing page.

**The feed's page-size cap is tied to two private constants by a comment
alone.** `FeedController`'s `MAX_SIZE = 99` exists because a page's distinct
beer and user ids must fit under `MAX_BATCH_IDS` in `CatalogApi.java:19` and
`ProfileApi.java:19`, and the only link between them is a comment (also
`FeedService.java:51-54`). If either cap is lowered, the anonymous feed becomes
a 500 through `Assert.isTrue`. A page that reads further to fill itself
resolves more ids per request, so the two findings meet in the same code.

(Quality backlog SHOULD-33 and SHOULD-44.)

## Scope

A feed page has public lines whenever older public lines exist within the
window, for every client, and the feed's request size can no longer exceed
what the catalog and profile module APIs accept without a test failing.

## Non-goals

- Delivery of events into the feed — [task 06](06-feed-events-delivered-at-least-once.md).
- The cursor signing key being generated per process. That is quality backlog
  SHOULD-47, still `[needs decision]`.
- Feed timestamps that never age — quality backlog COULD-36.
- The frontend's own mirror of the catalog batch cap in
  `features/cellar/api.ts:56-58`, which disappears with
  [task 10](10-cellar-reads-joined-in-the-backend.md).

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**the backend fills the page.** `FeedService` keeps reading until it holds a
full page of visible lines or reaches the end of the window, so every client
gets the fix, including iteration 9's mobile app. Having the frontend fetch
onward when a page comes back empty was considered and rejected.

- [ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md): visibility is
  enforced in `feed`'s application layer, and this keeps it there.
- `GET /api/v1/feed` is `permitAll`. A fill loop on an anonymous endpoint needs
  a bound on how many rows one request may scan, or a run of private lines
  becomes a cost any visitor can trigger
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)'s concern, applied
  to work rather than parameters).
- The page response keeps its contract (`lines`, `nextCursor`, `startOver`).

**Decided at refinement, 2026-10-15** (product owner):

- **One request scans at most 10 batches.** When it reaches that bound, it
  returns the lines it found, which may be none, together with a
  `nextCursor`. The front page then offers "load more" whenever a
  `nextCursor` exists, even with zero lines, and never shows the empty state
  while one does. Today's dead end becomes one more click.
- **`readBefore` fills its page the same way. `readSince` does not.** A poll
  that finds nothing new is normal, and an older page has the same empty-page
  problem as the first.
- **`CatalogApi` and `ProfileApi` chunk a large batch internally** rather than
  publishing their caps. That removes the coupling SHOULD-44 is about, and the
  feed's page size no longer has to fit under them.
  [Task 10](10-cellar-reads-joined-in-the-backend.md)'s whole-cellar join
  relies on the same chunking, since a cellar can hold more beers than one
  batch.

## Open questions

**None.**

## Acceptance criteria

- [ ] With the 21 newest lines all private and an older public line inside the
      window, the first page contains that public line — integration test,
      confirmed to fail against today's `readRecent`
- [ ] The scan bound holds: a long run of private lines costs a bounded number
      of rows per request — integration test
- [ ] A lookup of more ids than `CatalogApi`'s or `ProfileApi`'s batch cap is
      served in chunks rather than refused, so lowering either cap can no
      longer turn the feed into a 500 — unit test
- [ ] An older page (`before`) fills the same way as the first — integration
      test
- [ ] A page with no lines but a `nextCursor` offers "load more" rather than
      the empty state — component test, confirmed to fail against today's
      `FeedList`
- [ ] The front page shows the public line rather than the empty state, in a
      browser against the full stack — Playwright spec
- [ ] `mvn clean verify` and `npm test` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-33 and SHOULD-44,
both confirmed 2026-10-14. Merged because filling a page is what makes the
feed resolve more ids per request, which is exactly what SHOULD-44's coupling
guards.
