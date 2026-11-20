# Task 16: A write attempted offline says so

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-3

## Why

With no signal an add, an edit or a removal cannot reach the server, and the app
does not queue them
([task 01](01-decision-how-the-cellar-behaves-offline.md)). The failure to avoid
is the silent one: a user in a cellar who removes a bottle, sees nothing
happen, and believes it done.

## Scope

An add, an edit and a removal attempted with no connection are refused before
anything is sent, with what
[task 13](13-design-the-cellar-offline-and-a-write-that-fails.md) designed: the
user is told that nothing was saved and why. What they typed in the form is not
lost. The screen is as it was.

## Non-goals

- A write that reaches the server and is refused — [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).
- Queuing the write for later, which task 01 defers and names the trigger for.
- A write that was sent when the connection dropped. Its outcome is unknown; see
  the open questions.

## Constraints

- The check is made in one place, in front of the three mutations, not in each
  screen, so that a fourth write added later is covered by default
  ([task 15](15-the-app-knows-when-it-is-offline.md)'s state).
- **The API has no idempotency key.** A write whose response was lost may have
  been applied; retrying an add sends a second set of bottles. This task does
  not retry sends, and a write that fails in flight is reported as unknown, not
  as not saved.
- A refusal is a sentence a person reads and says what to do, found by a screen
  reader as it appears
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`.

## Open questions

- **A request that fails mid-flight.** The phone reports a connection and the
  request times out. The user is told the result is unknown and the cellar is
  read again when the connection returns, or something else?
- **The form's contents.** Kept open for the user to submit later, or closed
  with the entry unsaved.

## Acceptance criteria

- [ ] A component test shows an add, an edit and a removal each refused with
      the message and no request sent, and the cellar unchanged
- [ ] A component test shows the form keeping what was typed after a refused
      add
- [ ] A test shows a request failing in flight reported as unknown rather than
      as not saved, and nothing retried
- [ ] A test shows a write added to the feature without its own check refused
      offline as well
- [ ] A Maestro flow attempts a removal with the stack unreachable and reads
      the message on Android, and was confirmed to fail without the check
- [ ] The product owner tried each write offline on both platforms and signed
      the messages off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Persisted cache and
offline state"); DW-3's first half.
