# Task 07: An admin edits a suggestion before approving it

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2, DW-3

## Why

Most suggestions worth keeping are nearly right: a typo in the name, the wrong
style picked from the list, an ABV of `55` meant as `5.5`, a brewery's city
left out. Rejecting one for that throws away the contributor's effort and asks
them to type it again; approving it as it is puts the typo into a catalog
everyone shares. The product owner's brief asks for a third outcome — edit,
then approve — with the contributor seeing their addition as the admin changed
it.

An edit is also a write the add-beer path's guards were never asked to cover
twice: the same name rules, the same duplicate keys, and a contributor whose
cellar already holds the beer under its old name.

## Scope

An admin changes what [ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)
allows of a suggestion — the beer's fields, and the new brewery's when it came
with one, or the brewery it points at — and approves it in one action. The edit is held to the same
validation and duplicate checks as adding a beer; the contributor's cellar,
the beer's page and the event all show the edited version; and whether the
suggestion was edited is recorded, in the review record and the event, as the
ADR decides.

## Non-goals

- Editing an approved catalog beer, which stays in
  [the backlog](../backlog.md) ("Editing a catalog beer").
- The form — [task 11](11-design-the-admin-review-page.md).

## Constraints

- Follows [task 06](06-an-admin-approves-or-rejects-a-suggestion.md), whose
  approval, review record, event, `200` response, `409` and `404` it reuses
  rather than rebuilds.
- The rules a beer and brewery are added under bind an edit too: the style
  must be one the catalog knows, a name with a Unicode `Cf` character is
  refused `400`, names are folded with NFKC for the duplicate keys, and a
  country must be listed
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md),
  `ContributionService`). A second copy of those rules for edits is the drift
  to avoid.
- A duplicate the edit would create answers the `409` the add path already
  documents, naming the existing beer or brewery
  ([iteration 8.5 task 05](../iteration-8.5/05-brewery-questions-answered-by-the-api.md)),
  with one difference decided below;
  [task 13](13-domain-time-from-the-clock-and-one-read-per-duplicate.md)
  makes the brewery's duplicate path one read first. The suggestion's own beer
  and brewery are never a duplicate of themselves.
- The cellar read is joined with the catalog in the backend
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
  so a contributor's cellar shows the edited name without a cellar write; a
  feed line freezes only what `cellar` handed it
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md)).
- Bean Validation on the request DTO matches the add path's bounds
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- What an edit may change, re-pointing at an existing brewery included, and
  what the review record and the event keep of it are decided in ADR-0102
  ([task 02](02-decision-what-reviewing-a-suggestion-does.md)).
- ADR-0102's list of what an edit may change is closed. An edit therefore
  cannot add a brewery to a suggestion that came with an existing one, and a
  request that tries answers `400`.
- A request that carries the pending brewery's fields after a sibling's
  approval has approved that brewery was valid when composed and no longer is,
  so it answers `409` `problem+json`, as a concurrent decision does; the
  brewery is then an existing one and the page re-reads it.
- A brewery to re-point at that is not `APPROVED` is answered as the add path
  answers a brewery it cannot use: `404`.

**Decided at refinement, 2026-11-04** (product owner; the second pass on
2026-11-05 checked this file against ADR-0102):

- **An edit carries every field,** validated whole by the add path's rules; a
  partial patch was rejected.
- *Derived:* **re-pointing at an existing brewery rejects the new brewery in
  the same transaction,** unless another pending suggestion still needs it
  (ADR-0102's shared-brewery rule), and the event says the suggestion was
  edited.

**Decided at refinement, 2026-11-05** (product owner):

- **An edit's duplicate `409` names the existing beer or brewery whatever its
  status,** another contributor's `PENDING` suggestion included. The add path
  answers that case anonymously because its caller cannot open the row; an
  admin can, through [task 05](05-an-admin-reads-the-review-queue.md)'s read.
  Keeping the add path's anonymous `409` for an edit was rejected: the admin
  would have to search the queue for the other suggestion.

## Open questions

**None.**

## Acceptance criteria

- [ ] An integration test edits a suggestion's name, style and ABV and approves
      it, and the contributor's cellar and the beer's details then show the
      edited values
- [ ] An integration test edits a new brewery's name and country with its beer,
      and both are approved together
- [ ] An integration test re-points a suggestion at an existing brewery: the
      beer is approved under it, and the new brewery is rejected — or left
      pending while another suggestion still needs it
- [ ] An edit to a name already in the catalog answers the documented `409`;
      an unknown style, an unlisted country and a `Cf` character answer `400`
      — tests, each confirmed to fail without its check
- [ ] An edit to a name another contributor holds as `PENDING` answers `409`
      naming that beer or brewery, whose id the admin can open through task
      05's read — integration test
- [ ] An edit of a suggestion that is already decided, or decided
      concurrently, answers `409` as task 06's does; a non-suggestion answers
      `404`, a non-admin `403`, and the response of a successful edit is the
      suggestion as decided, `200` — integration tests
- [ ] The published event carries the edited values, says the suggestion was
      edited and holds the name as suggested; an unedited approval's event
      says neither — `@ApplicationModuleTest` scenario
- [ ] The review record keeps the values as suggested when edited, and a
      request whose values equal the suggested ones is recorded as an approval
      as it is, not an edit — integration test
- [ ] Re-pointing at a brewery that is not `APPROVED` answers `404`, editing a
      brewery's fields after a sibling's approval has approved it answers
      `409`, and adding a brewery to a suggestion that came with an existing
      one answers `400` — integration tests, each confirmed to fail without
      its check
- [ ] The add path and the edit path share one set of validation rules —
      a unit test of the shared rule, and no copy of it in the edit path
- [ ] The committed spec carries the operation
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "edit and approve
… the user sees his addition as it was changed".
