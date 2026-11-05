# Task 02: Decide what a suggestion is and what reviewing one does

- **Status:** done
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

**Decided at refinement, 2026-11-04** (product owner):

- **The term is *suggestion*** — for the domain type, the admin API's path
  (`/api/v1/admin/suggestions`), the events and the copy; *ehdotus* in
  Finnish.
- **Review lives inside `catalog`, behind an admin API of its own** under
  `/api/v1/admin/**` ([task 01](01-decision-who-is-an-admin.md)), not in a new
  Modulith module. Reviewing changes the catalog's own rows under the
  catalog's own validation rules, so a separate module would need either a
  command on `CatalogApi` — an exception to events-for-writes — or a decision
  the catalog applies later on an event, whose edit could not answer its
  `400` or `409` to the admin who made it. Both were rejected; the brief's
  "own module" is met as its own API.
- **The queue is derived from the catalog's pending beers,** each with its
  brewery when that is pending too, and **a review record is written when a
  suggestion is decided** — who decided, when, the outcome, the values as
  suggested when edited, and the reason. Today's pending rows need no
  migration. A suggestion row written at add time was rejected.
- **A pending brewery shared by several suggestions is approved by the first
  approval that needs it, and rejected only with the last pending suggestion
  that needs it;** rejecting one while another still waits leaves it pending.
- **An edit may change** the beer's name, style and ABV, a new brewery's name,
  country and city, and **may re-point the beer at an existing brewery** — the
  new brewery then rejected under the rule above. An edit is held to the add
  path's validation and duplicate checks, and the values as suggested are kept
  in the review record.
- **A rejection carries a required reason from a fixed list** — already in the
  catalog, not a real beer, inappropriate, incorrect details — stored as a
  code and shown to the contributor in their own language. Free text and no
  reason were rejected.
- **One event type, `SuggestionReviewed`,** is published per decision, whether
  or not the brewery was new, carrying its own `eventId`, the suggestion's id,
  the contributor's and the beer's ids, the outcome, the beer's name as
  decided, whether it was edited and the name as suggested, the reason code,
  and `occurredAt`. A pair of event types was rejected.
- **Removing an approved beer stays, as an admin operation:** through the admin
  API ([task 08](08-the-sql-moderation-script-is-retired.md)) and from the
  beer's details page ([task 20](20-an-admin-removes-an-approved-beer-from-its-page.md)).
  It publishes an event, named in the ADR, and notifies nobody.
- **The pending cap counts suggestions:** 20 per contributor, a beer with a new
  brewery counting once.
- **Rejections limit nothing** this iteration; SHOULD-80 returns to
  [the quality backlog](../quality-backlog.md).
- **Deciding a suggestion that is already decided, or decided concurrently,
  answers `409` `problem+json`** saying how it was decided. A silent no-op was
  rejected.
- *Derived:* **the public cellar's read-time exclusion stays.** A decision is
  synchronous and a cellar read is joined with the catalog
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
  so no copy exists for an event to keep current.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the term, where review lives and how it changes the
      catalog, what a suggestion is in the data, each outcome's effect on beer
      and brewery, the edit rules, the events and their payload, removal, the
      pending cap, and the rejected alternatives, and passes
      `node scripts/check-adrs.mjs`
- [x] ADR-0091 is amended where the decision changes what it states — the
      operator command, the cap's count, the revisit trigger — rather than
      contradicted ([ADR-0019](../../adr/0019-adr-format-and-conventions.md))
- [x] The glossary entry for the chosen term, and for the events, is drafted
      in the ADR's PR so [task 05](05-an-admin-reads-the-review-queue.md)
      inherits one vocabulary
- [x] Each test the decision implies — one event per suggestion with or
      without a new brewery, an edited name read back by the contributor, the
      shared-brewery case, a concurrent second decision — is named in the
      acceptance criteria of tasks
      [05](05-an-admin-reads-the-review-queue.md)–[08](08-the-sql-moderation-script-is-retired.md)
      before they are refined

## Notes

Provenance: the product owner's brief for iteration 10.5. A decision task, so
it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
