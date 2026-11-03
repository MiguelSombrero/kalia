# Task 17: A feed that opened empty polls only for what is new

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

The front page's feed reaches an open browser by polling with a "since"
cursor ([ADR-0060](../../adr/0060-feed-delivery-is-polling.md)). When the first
page it rendered was empty, `FeedList.tsx` polls with `since=""`; the backend
treats an empty cursor as none and returns a *backward* `nextCursor`
(`FeedController`, `FeedService`), and the list adopts it as the forward one.
From then on it walks back through history instead of waiting for new lines,
so a line added after the page opened can take far longer than ADR-0060's
60 seconds to appear (COULD-77).

An empty feed is exactly what a new deployment, a fresh worktree and every
end-to-end run start with.

## Scope

A feed that opened with no lines shows a line added afterwards within the
interval ADR-0060 states, and never reads history it already passed.

## Constraints

- The feed's cursor contract is public API
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)):
  changing what an empty `since` answers is a contract change to document; the
  mobile feed ([iteration 13](../iteration-13.md)) will read the same contract.
- The feed respects cellar visibility at read time
  ([ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md)).

## Open questions

1. **COULD-77 (`[needs decision]`):** the client ignores the cursor a
   cursor-less poll returns, or the backend returns a forward cursor for a
   read with no `since`.

## Acceptance criteria

- [ ] A component test of `FeedList` opened on an empty page shows a line added
      later arriving on the next poll, and no poll carrying a backward cursor;
      it failed before the fix
- [ ] If the backend answer changes, an integration test pins what a read with
      an empty `since` returns, and the spec documents it
- [ ] `npm test` and `make verify-fast` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-77, `[needs
decision]` (open question 1).
