# Task 15: The app knows when it is offline

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-2, DW-3

## Why

A cellar shown from the phone's memory looks exactly like one that is current.
TanStack Query assumes the device is online unless told otherwise, so with no
signal it tries each read, waits for it to fail and then reports an error. The
app needs one answer to "is there a connection", and the cellar needs to say
what it is showing.

## Scope

The app learns when the phone has no connection and when it returns, and gives
that to the data layer, so that reads stop being attempted without one and
resume when it comes back. The cellar says it is offline and, as
[task 13](13-design-the-cellar-offline-and-a-write-that-fails.md) designed it,
how old what it shows is.

## Non-goals

- Refusing writes — [task 16](16-a-write-attempted-offline-says-so.md).
- Offline states of the catalog and the feed beyond what an error already says.
- A manual "retry now"; the connection returning is enough.

## Constraints

- **A connectivity package is a new dependency:** asked about, with its version,
  before it is used ([`CLAUDE.md`](../../../CLAUDE.md)).
- "Connected" and "reachable" differ: a phone on a network with no route to the
  API is online to the device. The cellar's answer must not claim to be current
  because the radio is on; the read that fails is the evidence the notice
  rests on, whatever the package says.
- The state is a single source in `src/lib/`, read by features and not imported
  between them ([mobile conventions](../../../mobile/CONVENTIONS.md)); the
  query client's own online state is set from it in one place.
- Retries are configured once on the query client, and a screen that fails shows
  its own error and Retry
  ([mobile conventions](../../../mobile/CONVENTIONS.md)).
- A state change is announced to a screen reader and carried by more than colour
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`.

**Decided at refinement, 2026-11-22** (product owner):

- **The notice shows when the device reports no connection, or when the last
  read of the cellar failed on the network,** whatever the device reports; it
  hides on a successful read.
- **Returning online reads the cellar again at once.**
- **The age is always shown with the notice**
  ([task 01](01-decision-how-the-cellar-behaves-offline.md)).
- **On Android the tests and the sign-off switch the connection with the
  emulator's airplane mode;** the iOS Simulator has no switch of its own, so the
  iOS sign-off is on the iPhone.

## Open questions

**None.**

## Acceptance criteria

- [ ] A test shows the data layer paused when the connection is lost, reads
      resuming when it returns, and the cellar read again at once
- [ ] A component test shows the cellar with its notice and its age while
      offline and without them when online, announced to a screen reader
- [ ] A test shows the notice shown when the connection is reported on but the
      read fails, and not shown when a read succeeds
- [ ] A component test shows the notice at the largest font scale with a long
      Finnish string reading in full
- [ ] The product owner switched the connection off and on on both platforms and
      read the notice, and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Persisted cache and
offline state").
