# Task 21: A bottle that is already gone is not a failure

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

On the web, removing or updating a bottle that no longer exists — removed in
another tab, or on the phone — shows the generic failure and puts the stale
bottle back. `web/features/cellar/api.ts` throws on any non-2xx, `404`
included, so `removeBottleAction` never reaches `revalidatePath`, and
`RemoveBottleDialog` reports `{ failed: true }` and un-hides the bottle. It then
stays on screen until a reload.

Once the phone can remove and edit bottles
([task 11](11-a-user-edits-a-bottle.md),
[task 12](12-a-user-removes-a-bottle.md)), a user with both clients will meet
this every time they use one after the other, and [task 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)
shows an edit and a removal before the server answers, so a `404` read as a
rejection would put a gone bottle back. The rule is cheapest to
decide once, before the phone builds it a second way.

## Scope

- A removal that gets `404` counts as done: the bottle is gone, which is what
  the user asked for. The screen shows it gone and no failure is shown.
- An edit that gets `404` shows a message of its own, that the bottle no longer
  exists, and the entry is read again so the screen shows what is there.
- The rule is written once, in `docs/architecture.md`, and the web follows it;
  the phone follows it in [tasks 11, 12 and 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).

## Non-goals

- The phone's removal and edit, which are built in tasks 11 and 12 and follow
  this rule.
- An add that races another, which already has its `409` handling
  (`lostToConcurrentChange`).
- Telling the user who or what removed the bottle.

## Constraints

- **`404` is an answer the feature reads, not a failure** the transport throws
  ([ADR-0023](../../adr/0023-typed-api-failures.md)): the call declares it.
- **Every string in `en` and `fi`**, announced to a screen reader
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)).
- **A Server Action is not re-exported through a second `"use server"`
  file** — `web/features/cellar/actions.ts` explains how that fails silently.
- **Decided when the finding was lifted (2026-11-22):** a removal of a gone
  bottle is a success; an edit of a gone bottle shows its own message and
  refreshes the entry.

**Decided at refinement, 2026-11-22** (product owner):

- **An edit answered `404` closes the form and discards what was typed.** A
  notice on the entry says "This bottle had already been removed." / "Tämä pullo
  oli jo poistettu.", announced to a screen reader, and the entry is read again
  so the bottle disappears.
- **The rule's home is `docs/architecture.md` §4 (API design),** beside the
  other things a client reads from a status;
  `web/CONVENTIONS.md` and `mobile/CONVENTIONS.md` each point at it in one line,
  and tasks [11](11-a-user-edits-a-bottle.md), [12](12-a-user-removes-a-bottle.md)
  and [17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md) point
  at this task.

## Open questions

**None.**

## Acceptance criteria

- [ ] A web component test shows a removal answered `404` leaving the bottle
      gone, showing no failure message and reading the entry again. It failed
      before the change
- [ ] A web component test shows an edit answered `404` closing the dialog,
      showing its notice in `en` and `fi` to a screen reader, and the entry read
      again
- [ ] A Playwright test removes a bottle in one browser context that another
      context has already removed and finds it gone with no error, and was
      confirmed to fail before the change
- [ ] The rule is written once in `docs/architecture.md` §4, and
      `web/CONVENTIONS.md` and `mobile/CONVENTIONS.md` each point at it in one
      line
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-146
(`[needs decision]`, settled when lifted).
