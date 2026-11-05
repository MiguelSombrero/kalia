# ADR-0102: A suggestion is a pending beer with its new brewery, and an admin reviews it inside catalog, which publishes one event per decision

- **Status:** accepted
- **Date:** 2026-11-05

## Context

[ADR-0091](0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
made a contributed beer wait for an operator, and left review as one SQL
statement (`make moderate`) that changes every row one contributor added. Two
rows — a beer and the brewery added with it — carry two statuses and count as
two entries against the cap of 20. Nothing is published when a status changes,
so nothing can react, and the contributor is never told.

Iteration 10.5 replaces that with an admin who approves, rejects, or corrects
and approves each addition, a domain event per decision, and an API of its own.
Four questions have to be answered together because they share one boundary:
what an addition *is* in the data, which module reviews it and how that module
changes the catalog, what each outcome does to the beer and the brewery, and
what is published. The boundary is the expensive one to move once
[tasks 05–09](../tasks/iteration-10.5.md) build on it.

Two rules pull against each other. A cross-module write happens through an
event ([architecture §3](../architecture.md#3-backend-modules),
[ADR-0053](0053-cellar-domain-events-on-the-aggregate-root.md)); and an admin
who edits a suggestion must be answered `400` or `409` by the request that
made the edit, which an event applied later cannot do.

## Decision

**A user's addition is a *suggestion* — a pending beer together with the
brewery added with it — and an admin reviews it through an admin API inside the
`catalog` module, which changes the catalog's rows in one transaction and
publishes one `SuggestionReviewed` event per decision.** The term is
*suggestion* for the domain, the API's path (`/api/v1/admin/suggestions`), the
events and the copy; *ehdotus* in Finnish.

- **A suggestion is derived, not stored at add time.** It is a `catalog.beer`
  that is `PENDING` and has a contributor, with its brewery when that brewery
  is `PENDING` too. Its id is its beer's id. The review queue is a query over
  those rows, so the pending rows that exist today need no migration. A
  separate suggestion row written when a beer is added was rejected.
- **Review lives in `catalog`, behind an admin API of its own:** a controller,
  service and DTOs under `/api/v1/admin/**` (restricted to the admin role by
  [task 01](../tasks/iteration-10.5/01-decision-who-is-an-admin.md)'s rule),
  tagged apart in the committed spec. It is not a new Modulith module. It
  changes `catalog`'s own rows under `catalog`'s own validation, so it crosses
  no module boundary and the events-for-writes rule is untouched. It reads the
  contributor's username through `ProfileApi`, which gains a lookup by id apart
  from the cellar-visibility predicate.
- **Three outcomes, each in one transaction:**
  - *Approve as it is:* the beer becomes `APPROVED`, and so does its brewery
    when that is `PENDING`.
  - *Reject:* the beer becomes `REJECTED`, with a required reason. Its
    brewery becomes `REJECTED` only when no other `PENDING` beer still needs
    it.
  - *Edit and approve:* the edit is applied, then the suggestion is approved.
- **A pending brewery shared by several suggestions** (one contributor adding
  a second beer under their own pending brewery) is approved by the first
  approval that needs it, and rejected with the last pending suggestion that
  needs it. A rejection while a sibling still waits leaves it `PENDING`. A
  decision locks its beer row and then its brewery rows, in id order, before it
  counts siblings, so two siblings rejected at once cannot each see the other
  as pending and strand the brewery.
- **An edit may change** the beer's name, style and ABV, a new brewery's name,
  country and city, and may re-point the beer at an existing `APPROVED`
  brewery, which is then rejected under the rule above. An edit carries every
  field and is held to the add path's validation and duplicate checks through
  the same rules, not a copy of them. A brewery's fields can be edited only
  while it is `PENDING`: once a sibling's approval has approved it, it is an
  ordinary catalog row, whose editing stays in [the backlog](../tasks/backlog.md)
  ("Editing a catalog beer"). Values equal to the suggested ones are an
  approval as it is, not an edit.
- **A review record is written when a suggestion is decided** — `catalog.review`,
  one row per decision: the beer, who decided, when, the outcome, the reason
  code, and, when edited, the values as suggested (the beer's name, style, ABV
  and brewery, and a new brewery's name, country and city). A removal writes a
  row too. The record is the only trail of a decision now that no script runs,
  and the source of "edited" and "the name as suggested" in the event.
- **A rejection carries a required reason from a fixed list:** already in the
  catalog, not a real beer, inappropriate, incorrect details. It is stored as a
  code and shown to the contributor in their own language. Free text and no
  reason were rejected.
- **One event type, `SuggestionReviewed`, per decision,** whether or not the
  brewery was new. `Beer` registers it on itself as the aggregate root of a
  suggestion, drained on `save` ([ADR-0053](0053-cellar-domain-events-on-the-aggregate-root.md)),
  and consumers are idempotent on `eventId`
  ([ADR-0058](0058-feed-event-recording-model.md)). It carries `eventId`,
  `suggestionId`, `contributorId`, `beerId`, the outcome, the beer's name as
  decided, whether it was edited, the name as suggested (present only when
  edited), the reason code (present only on a rejection) and `occurredAt`.
  `suggestionId` and `beerId` hold the same value today, since a suggestion's
  id is its beer's; both are carried so a consumer names the suggestion without
  relying on that identity. A pair of event types, one for the beer and one for
  the brewery, was rejected, as was carrying the brewery.
- **The decision is synchronous.** The catalog is changed, and the admin
  answered, before any consumer runs; a consumer such as a notification is
  eventually consistent, and the admin's request never waits for it.
- **Deciding what is already decided answers `409` `problem+json`** that says
  how it was decided — the outcome, and when it was decided where a review
  record exists. A request that loses a race to a concurrent decision answers
  the same, because the decision waits on the beer's row lock and then finds
  the beer no longer `PENDING`. A silent no-op was rejected. A beer that is not
  a contributor's suggestion, an imported one included, answers `404`.
- **Removing an approved beer stays, as an admin operation** through the admin
  API ([task 08](../tasks/iteration-10.5/08-the-sql-moderation-script-is-retired.md))
  and from the beer's details page
  ([task 20](../tasks/iteration-10.5/20-an-admin-removes-an-approved-beer-from-its-page.md)).
  It moves an `APPROVED` beer to `REMOVED` (any other state answers `409`),
  writes a review record, and publishes `BeerRemoved` — `eventId`, `beerId`,
  `occurredAt` — which nothing consumes yet and which notifies nobody. It
  leaves the beer's brewery as it is.
- **The pending cap counts suggestions:** 20 per contributor, a beer with a
  new brewery counting once, since a suggestion is the unit. The refusal stays
  the documented `429`, and rejections limit nothing this iteration
  (SHOULD-80 returns to [the quality backlog](../tasks/quality-backlog.md)).
- **The public cellar's read-time exclusion stays.** A decision is synchronous
  and a cellar read is joined with the catalog
  ([ADR-0083](0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
  so no stored copy exists for an event to keep current, and ADR-0091's
  trigger for revisiting it is met without changing it.
- **No operator path stays.** `make moderate` and its script are retired
  ([task 08](../tasks/iteration-10.5/08-the-sql-moderation-script-is-retired.md)),
  and everything they did that this ADR keeps is in the admin API. The
  hidden-never-deleted rule, the duplicate-key rule and `REJECTED` and
  `REMOVED` being withheld everywhere are unchanged from ADR-0091.

## Alternatives considered

- **A new Modulith `review` module with a command on `CatalogApi`.** Meets the
  brief's "own module" literally, but a command that writes another module's
  rows is an exception to events-for-writes, and `CatalogApi` is a read API
  today. Rejected: the exception buys a module boundary with nothing on the far
  side of it.
- **A `review` module that publishes a decision and `catalog` applies it on the
  event.** Keeps the rule, but the edit's `400` and `409` come from the catalog
  after the admin's request has already returned, so the admin cannot be
  answered, and the decision is eventually consistent for no gain. Rejected.
- **A suggestion row written at add time,** with the beer and brewery hanging
  off it. Gives a suggestion an id of its own and a status, but it duplicates
  the beer's `PENDING` state, needs a migration for the pending rows that
  exist, and adds a second place the two can disagree. Rejected: the queue is
  derivable, and a record is needed only when something is decided.
- **Two events, one per beer and one per brewery.** What status columns would
  suggest, but the brief asks for one per addition and a consumer would have to
  pair them. Rejected.
- **A free-text reason, or none.** Free text cannot be shown in the
  contributor's language ([ADR-0011](0011-i18next-localization.md)), and no
  reason leaves a rejection unexplained. Rejected for a fixed list of codes.
- **A silent no-op on a decided suggestion.** Hides that two admins, or a
  retry, disagreed. Rejected for `409`.
- **A partial edit (a patch).** Leaves open which fields the rules apply to.
  Rejected for an edit that carries every field.
- **Limiting what a contributor may suggest after rejections** (a cooldown, or
  rejected suggestions counting toward the cap). Deferred, not decided: the
  product owner chose to limit nothing yet, and the shape of a limit is
  SHOULD-80 in the quality backlog.
- **Dropping the public cellar's read-time exclusion** in favour of a stored
  copy kept current by the event. Rejected: there is no copy to keep, because
  the cellar read is joined in the backend.

## Consequences

- Good, because a decision answers the admin with the catalog's own `400` and
  `409`, and a beer and its brewery never disagree for the length of a request.
- Good, because the admin API and the event are the only ways a status changes,
  so every change is recorded and published, which the script never did.
- Good, because the pending rows that exist today are already suggestions: no
  migration, no backfill.
- Good, because a contributor's cap no longer counts the brewery they were
  forced to add, and a beer with a new brewery is one thing to review, not two.
- Bad, because review is not an extractable module: the day something other
  than an admin needs to request a catalog change, the boundary has to be cut
  then.
- Bad, because an approved brewery cannot be taken down by the admin API, as
  the script could remove a contributor's breweries; a removed beer leaves its
  brewery listed. Removing a brewery is a backlog item.
- Bad, because a suggestion has no row of its own until it is decided, so
  nothing records when it left the queue except the review record, and a
  suggestion approved before this iteration (by the script) has no record at
  all.
- Bad, because `suggestionId` and `beerId` are the same value, and a consumer
  that treats them as different keys would be wrong.
- Neutral, because the review record holds the deciding admin's id, which
  [task 15](../tasks/iteration-10.5/15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md)'s
  account-deletion strategy has to account for.
- Neutral, because `BeerRemoved` is published with no consumer; the public
  cellar's exclusion is the reason it is not yet needed.
- **Revisit trigger:** a second kind of change request to the catalog that is
  not an admin's decision, or a consumer that needs a suggestion's history
  before it is decided — either wants a stored suggestion and possibly a module
  of its own.
