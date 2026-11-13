# Design record: the surface, and the choice made for it

- **Status:** accepted | superseded
- **Date:** YYYY-MM-DD
- **Task:** `[iteration N task NN](../tasks/iteration-N/NN-slug.md)`

Optional metadata, present only when it applies, in this order after `Task`:

- **Departs from:** `[ADR-NNNN](../adr/NNNN-slug.md)` — the design ADR whose
  choice this changes, in one line
- **Superseded-by:** `[record](iteration-N-NN-slug.md)` — the record that
  replaced this one, in one line
- **ADR:** `[ADR-NNNN](../adr/NNNN-slug.md)` — the architectural part of the
  choice, when it had one

Render these as real markdown links; they are shown as code here only so this
template contains no dangling reference of its own.

## Question

What the surface had to answer, in a few sentences. The task file holds the
request in full: link it rather than restating it.

## Directions shown

One block per direction, across every round, each described well enough that
a reader who never saw the mockup or native build understands what it was, and
ending in why it lost — or, for the one chosen, that it was chosen. For a
mobile task, say which round was framed and which native.

## Choice

Open with one sentence naming the direction chosen, readable on its own. Then
what it covers and what it deliberately leaves alone. Standing intent the
choice adds goes in `docs/design.md`, and this section points there.

## Agreed departures

Optional. Where the built surface differs from the chosen direction by the
product owner's agreement when it was confirmed in the real app, and why.

## Sign-off

How the product owner signed it off, in words: the widths seen in the browser
pane, or the phone in phone mode and the VoiceOver walk. Never an image.
