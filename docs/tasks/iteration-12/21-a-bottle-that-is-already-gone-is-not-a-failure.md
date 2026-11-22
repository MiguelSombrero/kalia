# Task 21: A bottle that is already gone is not a failure

- **Status:** needs-refinement
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
lists the `404` among the rejections it rolls back. The rule is cheapest to
decide once, before the phone builds it a second way.

## Scope

- A removal that gets `404` counts as done: the bottle is gone, which is what
  the user asked for. The screen shows it gone and no failure is shown.
- An edit that gets `404` shows a message of its own, that the bottle no longer
  exists, and the entry is read again so the screen shows what is there.
- The rule is written once where [tasks 11, 12 and 17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)
  will read it, and the web follows it.

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

## Open questions

- **Interaction and UX.** The wording of the message for an edit of a gone
  bottle, in `en` and `fi`, and where it is shown: in the edit dialog, or as a
  toast after the dialog closes.
- **Edge cases.** What the user's typed edit does when the bottle is gone:
  discarded, or kept in the form for a moment.
- **Module boundaries.** Where the rule is written so the phone's tasks find
  it — a line in `web/CONVENTIONS.md` and `mobile/CONVENTIONS.md`, or the
  tasks' own Constraints.

## Acceptance criteria

- [ ] A web component test shows a removal answered `404` leaving the bottle
      gone, showing no failure message and reading the entry again. It failed
      before the change
- [ ] A web component test shows an edit answered `404` showing its own message
      in `en` and `fi`, and the entry read again
- [ ] A Playwright test removes a bottle in one browser context that another
      context has already removed and finds it gone with no error, and was
      confirmed to fail before the change
- [ ] The rule is written once, and tasks 11, 12 and 17 point at it
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-146
(`[needs decision]`, settled when lifted).
