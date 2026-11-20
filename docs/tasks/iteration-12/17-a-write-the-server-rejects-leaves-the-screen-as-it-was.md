# Task 17: A write the server rejects leaves the screen as it was

- **Status:** needs-refinement
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

An add, an edit and a removal show on the screen as soon as they are made and
are put back, with the reason, when the server rejects them. "Rejects" covers a
validation failure, a `404`, a `409` and a server error; the screen is as it
was before the attempt, in the entry, in the list, in the totals and in the held
count on a beer's page. The server's answer replaces what was shown once it
arrives.

## Non-goals

- A write attempted offline — [task 16](16-a-write-attempted-offline-says-so.md).
- Retrying a rejected write by itself.
- Showing a catalog beer's own data optimistically; only the cellar's data is.

## Constraints

- A mutation's optimistic change and its rollback are written once, around the
  three mutations, and not in each screen. A rollback restores what the cache
  held before the attempt, and an in-flight read must not overwrite the
  optimistic value or the restored one (the usual cancel-before-write rule of
  [TanStack Query's optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)).
- **An add has no id until the server answers.** The optimistic bottle carries a
  local one, which the server's replaces; a swipe or an edit on a bottle that
  has only a local id waits for the real one rather than sending it.
- Two writes in quick succession (an add and then a removal of the same
  bottle) are applied in order, and the rollback of the first does not undo the
  second.
- A rejected write's message is the one
  [task 13](13-design-the-cellar-offline-and-a-write-that-fails.md) designed,
  announced to a screen reader
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`.
- The server stays the authority: the optimistic state is a guess, and a read
  after the write settles reconciles whatever it got wrong.

## Open questions

- **A timeout.** A request that does not answer for some seconds: the screen
  keeps the guess and says it is saving, or rolls back at a limit — which is
  wrong if the server then applies it.
- **The `409`.** The server changed nothing and asks for a repeat; rolled back
  with a retry, or repeated once without the user knowing.
- **Whether an add is optimistic at all,** given that its bottles' ids and
  creation times are the server's, or only an edit and a removal are.

## Acceptance criteria

- [ ] A component test shows an add, an edit and a removal each showing at once
      and, with the server rejecting, each restoring the entry, the list, the
      totals and the held count to what they were
- [ ] A test shows a read in flight not overwriting the optimistic value, and a
      second write's rollback not undoing the first's result
- [ ] A test shows a bottle with a local id taking no edit or removal until its
      real id arrives
- [ ] A component test shows each rejection — validation, `404`, `409` and a
      server error — ending in its own message
- [ ] A Maestro flow removes a bottle against a backend that rejects the
      write and reads the unchanged count with the message on Android, and was
      confirmed to fail against the waiting implementation
- [ ] The product owner used the flows on both platforms and signed them off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Optimistic writes with
rollback"); DW-3's second half.
