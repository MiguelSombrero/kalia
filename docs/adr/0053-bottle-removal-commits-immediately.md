# ADR-0053: Bottle removal commits immediately behind a confirmation dialog, dropping undo

- **Status:** accepted
- **Date:** 2026-09-04

## Context

[Iteration 5 task 14](../tasks/iteration-5/14-edit-remove-bottle.md) shipped
bottle removal as an optimistic hide plus an undo toast: clicking Remove
hides the bottle immediately, and the real `DELETE
/api/v1/cellar/bottles/{id}` is *delayed* until a ~5 second countdown elapses
uncancelled. The pending commit lives entirely in the browser tab — a
Zustand store plus a module-scoped `setTimeout` closure
(`frontend/features/cellar/store.ts`).

Found live on `dev` 2026-09-03: a full reload, a client navigation to
another route, or closing the tab inside that window destroys the timer
before it fires. The `DELETE` is never sent and the removal silently
reverts — the bottle reappears with no message. This is reachable in
ordinary use (remove, then navigate back to the catalog), not a corner case,
and it is the direct consequence of [ADR-0009](0009-zustand-ui-state.md)'s
warning against holding commit-critical intent in a Zustand store — this
flow was the exact case that warning names.

The product owner's direction on the bug report: undo must depend **only**
on pressing the Undo button — not on anything else surviving in the tab —
and if that cannot be built, the Undo button should be removed entirely
([iteration 6 task 13](../tasks/iteration-6/13-bottle-removal-lost-on-navigation.md)).

## Decision

**Removing a bottle now requires an upfront confirmation dialog; confirming
commits the `DELETE` immediately, and there is no undo.** The dialog is
built on the existing `components/ui/dialog.tsx` Radix wrapper, the same
primitive `AddBottleDialog`/`EditBottleDialog` already use. A toast
(`components/ui/toast.tsx`) still reports the outcome — success, the "that
beer is no longer in your cellar" message when a removal empties an entry,
and failure — but carries no Undo action or countdown; it uses Radix's own
auto-dismiss timer instead of a deadline `store.ts` owns.

`features/cellar/store.ts`'s delayed-dispatch machinery — `startRemoval`,
`undoRemoval`, `REMOVE_UNDO_DELAY_MS`, the `finalizing` queue that let a
second removal force-finalize a first pending one — is deleted rather than
adapted. None of it has a job once a removal commits the moment it is
confirmed: there is nothing left pending to finalize early.

## Alternatives considered

**Immediate `DELETE`, with Undo implemented as a re-add** (re-`POST` the
removed bottle's data). Rejected: the restored bottle gets a new id, a new
`created_at`/`updated_at`, and — if the original was its entry's last bottle
— a new entry too. What comes back is not the row that was removed, and
that mismatch between what the user asked to undo and what they get back
was judged worse than having no undo at all.

**Keep the delayed `DELETE`, but flush the pending commit on
`pagehide`/`visibilitychange` via `navigator.sendBeacon` or a `keepalive`
fetch**, so leaving the page commits the removal instead of cancelling it.
Rejected: delivery on those paths is explicitly best-effort under the
Beacon and fetch-keepalive specs, not guaranteed under every unload path (a
crash, a forced tab kill) — and a destructive action's commit was judged
not acceptable to leave best-effort.

**Keep the delayed `DELETE`, persist the pending-removal intent (e.g.
`sessionStorage`) and reconcile it on the cellar's next load.** Rejected
outright rather than weighed against the others: `sessionStorage` does not
survive a closed tab, which is one of the three loss modes (reload,
navigation, closed tab) this decision exists to close. This alternative
fails the same way the original bug does, just for one of the three cases
instead of all of them.

## Consequences

- Good, because a removal's outcome no longer depends on anything surviving
  in the browser tab — the exact case [ADR-0009](0009-zustand-ui-state.md)
  warns against no longer applies to this flow.
- Good, because the confirm-then-commit model needs no client-only deadline
  at all, so `store.ts` loses its module-scoped `setTimeout`/closure
  machinery entirely instead of trading one timing bug for a
  differently-shaped one.
- Bad, because removing a bottle now costs an extra click — the confirmation
  dialog — on every removal, where the undo toast let a mistaken click be
  corrected after the fact at zero up-front cost. The safety net moved from
  after the action to before it.
- Bad, because a user who preferred the low-friction undo flow loses it
  outright, with no server-side "undelete" to fall back to instead — task
  14's own non-goal, unchanged here.
- Neutral, because `@radix-ui/react-toast` stays a dependency for a
  narrower purpose than it was taken on for; [ADR-0021](0021-design-tokens-ui-primitives.md)
  is amended in the same pull request as this decision to record the
  narrowed contract.
- **Revisit trigger:** if a server-side "undelete"/soft-delete endpoint is
  ever built for another reason, the undo toast becomes viable again without
  the id/entry-mismatch problem the first alternative above ran into, and is
  worth reconsidering then.
