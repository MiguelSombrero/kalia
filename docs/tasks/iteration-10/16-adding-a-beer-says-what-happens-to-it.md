# Task 16: Adding a beer says what happens to it, and never dead-ends

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

The add-beer flow on the web misinforms or strands a contributor in four
ways, all filed after iteration 8 shipped review of contributed entries
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)):

- **It says a pending beer is public.** The dialog says "A beer you add is in
  the catalog for everyone at once" and the success line "… is in the
  catalog" (`catalog.add.description`, `catalog.added`; asserted in
  `JustAdded.test.tsx`), while the beer is invisible to everyone else until an
  operator approves it (SHOULD-93).
- **The pending cap reads as a glitch.** The 429 for twenty pending entries
  shows "Could not add the beer. Please try again.": `features/catalog/api.ts`
  handles 201, 400, 404 and 409 and throws a generic error otherwise, so a
  contributor retries forever. Nothing in the web code or tests mentions the
  cap (SHOULD-73).
- **Someone else's pending beer blocks yours.** Duplicate lookups include
  other contributors' `PENDING` rows, the 409 offers that row, and choosing it
  404s because `findVisibleById` hides it from anyone but its contributor.
  One account can hold twenty such names until an operator acts (SHOULD-72).
- **A zero-width space passes the client.** `addBeerSchema.ts` refuses
  `\p{Cc}` but the server refuses `\p{Cc}\p{Cf}`, so the user gets the generic
  `refusedField` instead of `nameInvalid` (COULD-80).

The dialog these land in, `web/features/catalog/AddBeerDialog.tsx`, already
holds the form state, the brewery-choice state machine, the mapping of
refusals onto fields, three outcome alerts and navigation in one component
(COULD-61); a fourth alert lands more safely in an extracted, separately
tested piece.

Mobile's add-beer flow is not scheduled yet, but it will inherit the API's
answers and the shared locale strings
([ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)).

## Scope

The add-beer flow tells the contributor that their beer waits for review, says
plainly when they have reached the pending cap, never offers a beer they
cannot choose, and refuses the same characters the server refuses with the
same message.

## Constraints

- Finnish is a full peer of English
  ([ADR-0011](../../adr/0011-i18next-localization.md)); every string in both
  locales, in the shared locale package.
- [ADR-0082](../../adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md):
  how a beer is added over the search that missed it.
- ADR-0091 accepts disclosing that a name is pending elsewhere, not the dead
  end; a new 409 shape is a documented, typed error
  ([iteration 8.5 task 01](../iteration-8.5/01-api-errors-complete-and-typed.md)).
- The cap's number lives in `ContributionService.MAX_PENDING_ENTRIES` and
  ADR-0091 only; the UI must not restate it as a literal.

**Decided at refinement, 2026-11-01** (product owner):

- **SHOULD-72: "pending elsewhere" is its own anonymous `409`.** It names no
  contributor and offers no entry to choose; the dialog says the beer has
  already been suggested and waits for review. Duplicate lookups keep seeing
  other contributors' pending rows, so two copies of one name are never
  submitted. ADR-0091 records the outcome.
- **Wording** for the description, the success line, the cap and the
  pending-elsewhere message is drafted in the PR, in both locales, for the
  product owner's review.
- **COULD-61: the outcome alerts are extracted** into one separately tested
  component; the brewery-choice mode stays in the dialog.

## Open questions

**None.**

## Acceptance criteria

- [ ] A unit test shows the cap's 429 producing its own message, and it failed
      before the fix
- [ ] `JustAdded.test.tsx` and the dialog's tests assert the review-waiting
      wording in both locales
- [ ] An integration test covers a second contributor adding a name another
      contributor holds as pending, and gets the documented pending-elsewhere
      `409` naming no contributor and no entry
- [ ] A unit test shows the dialog's pending-elsewhere message, with no entry
      offered to choose
- [ ] A unit test shows a zero-width space refused client-side with
      `nameInvalid`
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-93 and SHOULD-73
(both lost from PR #452, see SHOULD-90), SHOULD-72 (`[needs decision]`, open
question 1), COULD-80 and COULD-61.
