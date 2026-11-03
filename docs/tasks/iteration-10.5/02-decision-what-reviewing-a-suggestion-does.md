# Task 02: Decide what a suggestion is and what reviewing one does

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2, DW-3, DW-4

## Why

Today a contributed beer and the brewery added with it are two rows with two
`moderation_status` values, counted as two entries against the pending cap, and
`make moderate` changes them for *everything one contributor added* in one SQL
statement that publishes nothing
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
The product owner's brief for this iteration asks for something different on
every count:

- **One unit per addition.** A beer added under an existing brewery is one
  suggestion; a beer added with a new brewery is still one, and the admin
  approves or rejects the two together.
- **Three outcomes:** approve as it is, reject, or edit and approve — fixing a
  typo in the name, say — with the contributor then seeing their addition as
  the admin changed it.
- **A domain event per decision,** one per suggestion whether or not its
  brewery was new, which the contributor is later shown.
- **Its own module and API** for admin operations.

Those four touch the catalog's data model, the boundary between modules, the
event contract, and the wording a user reads. They have to be settled together
and recorded before [tasks 05](05-an-admin-reads-the-review-queue.md)–[09](09-a-contributor-is-told-what-became-of-their-suggestion.md)
build them, because the module boundary in particular is expensive to move once
built.

## Scope

An ADR — amending ADR-0091, or superseding the parts it replaces — records
what a suggestion is, which module owns reviewing it and how that module
changes the catalog, what each outcome does to the beer and the brewery, what
an edit may change, the events and what they carry, and what replaces
`make moderate`.

## Non-goals

- Implementing it — tasks [05](05-an-admin-reads-the-review-queue.md),
  [06](06-an-admin-approves-or-rejects-a-suggestion.md),
  [07](07-an-admin-edits-a-suggestion-before-approving-it.md) and
  [08](08-the-sql-moderation-script-is-retired.md).
- How the contributor is shown the outcome — [task 03](03-decision-how-a-contributor-is-notified.md).
- Editing an *approved* catalog beer, which stays in
  [the backlog](../backlog.md) ("Editing a catalog beer").

## Constraints

- **Cross-module writes happen through events,** registered on the aggregate
  root and drained on `save`, never published from a service; cross-module
  reads go through the root-package API
  ([architecture §3](../../architecture.md#3-backend-modules),
  [ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)).
  A review module that changes catalog rows directly breaks that rule; one that
  waits for the catalog to follow an event makes the admin's decision
  eventually consistent. Either is a choice the ADR has to own.
- Events are consumed at least once, by idempotent listeners keyed on an event
  id ([ADR-0058](../../adr/0058-feed-event-recording-model.md),
  [ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)).
- No catalog row is ever deleted (ADR-0091); a hidden row leaves the duplicate
  key, so a rejected name can be suggested again.
- [Iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
  decided that `REJECTED` and `REMOVED` are withheld everywhere, and
  [task 16](../iteration-10/16-adding-a-beer-says-what-happens-to-it.md) that a
  name pending for another contributor answers its own anonymous `409`. Both
  land before this iteration, and this decision builds on them.
- The public cellar excludes non-approved beers at read time because
  `make moderate` "publishes nothing a copy could follow; it is revisited when
  moderation has an application path that can publish events"
  ([architecture §4](../../architecture.md#4-api-design)). That path is
  what this decision creates; the ADR says whether the read-time exclusion
  stays.
- `/api/v1` changes additively only
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)):
  a changed pending-cap count or a new refusal on `POST /beers` is a contract
  change to document, not to slip in.
- A module per subdomain, named for it
  ([ADR-0007](../../adr/0007-backend-package-structure.md)); the term each
  module owns is in [`docs/glossary.md`](../../glossary.md), which already
  calls the user a **contributor** and the dialog's copy already says a beer
  "has already been suggested".

## Open questions

1. **The word:** *suggestion*, *contribution* or *submission* — for the
   domain type, the API path, the events and the copy, in both locales — and
   the module's name (`moderation`, `review`, `admin`).
2. **Where reviewing lives and how it writes the catalog:** a new module that
   owns review records and publishes a decision the catalog applies on an
   event; a new module calling a command on `CatalogApi` (a recorded exception
   to the events-for-writes rule); or review inside `catalog` behind its own
   admin controller, with "own module" meaning its own API rather than its own
   Modulith module.
3. **What a suggestion is in the data:** derived from the pending beer (and its
   pending brewery when it came with one), or a row of its own linking them
   and recording who decided, when, and what was changed.
4. **The pending brewery shared by several suggestions.** A contributor can add
   a second beer to their own still-pending brewery. Does approving the first
   approve the brewery for both; does rejecting the first reject the second,
   leave it pending, or forbid the rejection until both are decided?
5. **What an edit may change:** the beer's name, style and ABV; the new
   brewery's name, country and city; and whether the admin may re-point the
   beer at an *existing* brewery instead of the new one (the new brewery then
   rejected) — the common fix for a brewery suggested twice under slightly
   different names.
6. **What an edit is held to:** the same validation and duplicate checks as
   adding (styles, the `Cf` refusal, the folded-name keys); and whether the
   original as suggested is kept for the record or overwritten.
7. **A reason for rejection:** none, a fixed list, or free text — and whether
   the contributor sees it, since free text is untranslated and is itself
   content the admin writes.
8. **The events:** names (`BeerSuggestionApproved` and
   `BeerSuggestionRejected`, one `SuggestionReviewed` carrying its outcome, or
   another pair), and what they carry — the suggestion, contributor and beer
   ids, the beer's name as decided, whether it was edited, the reason.
9. **Removing an approved beer.** `make moderate ACTION=remove` takes one down;
   does the admin page do the same, and does removal publish an event and
   notify the contributor too?
10. **The pending cap:** does a suggestion with a new brewery still count as
    two of the 20, and do rejections count toward a cooldown (SHOULD-80, which
    [task 08](08-the-sql-moderation-script-is-retired.md) implements)?
11. **Two admins deciding one suggestion at once:** the second answered `409`,
    or the first decision wins and the second is a no-op.

## Acceptance criteria

- [ ] An ADR records the term, the owning module and how it changes the
      catalog, what a suggestion is in the data, each outcome's effect on beer
      and brewery, the edit rules, the events and their payload, removal, the
      pending cap, and the rejected alternatives, and passes
      `node scripts/check-adrs.mjs`
- [ ] ADR-0091 is amended where the decision changes what it states — the
      operator command, the cap's count, the revisit trigger — rather than
      contradicted ([ADR-0019](../../adr/0019-adr-format-and-conventions.md))
- [ ] The glossary entry for the chosen term, and for the events, is drafted
      in the ADR's PR so [task 05](05-an-admin-reads-the-review-queue.md)
      inherits one vocabulary
- [ ] Each test the decision implies — one event per suggestion with or
      without a new brewery, an edited name read back by the contributor, the
      shared-brewery case, a concurrent second decision — is named in the
      acceptance criteria of tasks
      [05](05-an-admin-reads-the-review-queue.md)–[08](08-the-sql-moderation-script-is-retired.md)
      before they are refined

## Notes

Provenance: the product owner's brief for iteration 10.5. A decision task, so
it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
