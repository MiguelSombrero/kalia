# Task 17: A write the server rejects leaves the screen as it was

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-3

## Why

Tasks [08](08-a-user-adds-bottles-of-a-beer-from-its-page.md),
[11](11-a-user-edits-a-bottle.md) and [12](12-a-user-removes-a-bottle.md) wait
for the server before the screen changes, which is correct and slower than a
phone should feel: a removal that takes a round trip to show is the web's
speed, and the product is meant to be faster than that. Showing the change at
once means the screen can be wrong, and then it has to be put back.

## Scope

An edit and a removal show on the screen as soon as they are made and are put
back, with the reason, when the server rejects them. "Rejects" covers a
validation failure, a `409` and a server error, while a `404` ends as
[task 21](21-a-bottle-that-is-already-gone-is-not-a-failure.md) rules; the screen is as it
was before the attempt, in the entry, in the list, in the totals and in the held
count on a beer's page. The server's answer replaces what was shown once it
arrives.

## Non-goals

- A write attempted offline — [task 16](16-a-write-attempted-offline-says-so.md).
- Retrying a rejected write by itself.
- An add shown before the server answers; it waits, as task 08 builds it.
- Showing a catalog beer's own data optimistically; only the cellar's data is.

## Constraints

- A mutation's optimistic change and its rollback are written once, around the
  two mutations, and not in each screen. A rollback restores what the cache
  held before the attempt, and an in-flight read must not overwrite the
  optimistic value or the restored one (the usual cancel-before-write rule of
  [TanStack Query's optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)).
- Two writes in quick succession (an edit and then a removal of the same
  bottle) are applied in order, and the rollback of the first does not undo the
  second.
- A rejected write's message is the one
  [task 13](13-design-the-cellar-offline-and-a-write-that-fails.md) designed,
  announced to a screen reader
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`.
- The server stays the authority: the optimistic state is a guess, and a read
  after the write settles reconciles whatever it got wrong.

**Decided at refinement, 2026-11-22** (product owner):

- **Only an edit and a removal are shown at once.** An add waits for the server,
  as [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md) builds it, so no
  bottle ever carries a local id.
- **A `404` is not a rejection:** a removal's is the removal done and an
  edit's reads the entry again, as [task 21](21-a-bottle-that-is-already-gone-is-not-a-failure.md) rules.
- **A `409` is rolled back with task 08's message and a retry;** nothing is
  repeated without the user.
- **A write whose answer never arrives keeps the optimistic value, marked not
  confirmed, and is not rolled back at a deadline;** the read
  [task 16](16-a-write-attempted-offline-says-so.md) then makes settles it.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows an edit and a removal each showing at once, before
      the server answers, and, with the server rejecting, each restoring the
      entry, the list, the totals and the held count on the beer's page to what
      they were. It failed against the waiting implementation
- [ ] A test shows a read in flight not overwriting the optimistic value, and a
      second write's rollback not undoing the first's result
- [ ] A test shows an add not shown before the server answers
- [ ] A component test shows each rejection — validation, `409` and a server
      error — ending in its own message, and an edit's and a removal's `404`
      each ending as task 21 rules, not rolled back
- [ ] A test shows a write whose answer never arrives keeping the optimistic
      value marked not confirmed, not rolled back at the deadline, and the read
      that follows replacing it
- [ ] The product owner used the flows on both platforms and signed them off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Optimistic writes with
rollback"); DW-3's second half.
