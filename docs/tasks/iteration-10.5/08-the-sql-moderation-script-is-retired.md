# Task 08: The SQL moderation script is retired, and an admin can remove an approved beer

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2

## Why

`make moderate` runs `scripts/moderate-contributor.sql` through
`docker compose exec`. It acts on every row a contributor added at once —
removing one bad beer also removes their approved ones — writes `catalog`
tables around the domain, reads `profile.profile` across schemas, publishes no
event, and has no way to look before it commits (SHOULD-80, COULD-99). Once
tasks [06](06-an-admin-approves-or-rejects-a-suggestion.md) and
[07](07-an-admin-edits-a-suggestion-before-approving-it.md) give review an
application path, keeping the script leaves a second way to change a status
that bypasses every event the first one publishes.

The script is also the only way to take down a beer that was approved and
should not have been, so retiring it means the admin API can do that too.

## Scope

`make moderate`, `scripts/moderate-contributor.sql` and the integration test
that runs the script are gone, along with every mention of them in the docs,
and whatever they could do that the admin API cannot is in it: an admin removes
an approved beer, imported and seeded ones included
([ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)
keeps removal, and nothing else of the script stays). The pending cap counts
suggestions rather than entries, as the ADR decides: a contributor's `PENDING`
beers, so a beer added with a new brewery counts once.

## Non-goals

- Bulk actions on a contributor's whole output: refinement kept none.
- A dry-run mode for the script (COULD-99): the script is removed rather than
  improved, and the admin page shows what it acts on before it acts.
- Rejections limiting what a contributor may suggest next — SHOULD-80's second
  half, returned to [the quality backlog](../quality-backlog.md) at
  refinement.
- The removal action on a beer's page —
  [task 20](20-an-admin-removes-an-approved-beer-from-its-page.md).

## Constraints

- Follows [task 06](06-an-admin-approves-or-rejects-a-suggestion.md), whose
  review record, event registration and `409` it reuses; removal is one more
  outcome of the same machinery, not a second one.
- The script is mentioned in the Makefile (`.PHONY` and its target), the
  root `README.md`'s note on which commands connect as the superuser,
  `backend/README.md`'s "Moderating contributions" section,
  `docs/architecture.md` §3, §4 and §8, [the backlog](../backlog.md)'s catalog
  entry, the glossary's `Brewery` and `ModerationStatus` rows, ADR-0091 and
  ADR-0100. Finished task files and the quality backlog's lifted entries stay
  as they were, being history; ADRs change by amendment
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- `ContributionModerationIT` runs the real script, so it goes with it. What it
  pinned that outlives the script — no catalog row is deleted, and a holder's
  cellar entry for a rejected or removed beer remains
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md))
  — is pinned again against the admin API, not dropped with it.
- ADR-0091 states the operator command as its decision; it is amended, not
  contradicted ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- The pending cap's `429` is a documented response of `POST /api/v1/beers`; a
  cooldown that refuses differently is a contract change to document
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  and the add dialog's cap message
  ([iteration 10 task 16](../iteration-10/16-adding-a-beer-says-what-happens-to-it.md))
  must still say what happened.
- Two adds by one contributor are serialised by an advisory lock, so a count
  is never read by both.
- Removal staying as an admin operation, its event and review record, leaving
  the beer's brewery as it is, and the cap counting suggestions are decided in
  ADR-0102 ([task 02](02-decision-what-reviewing-a-suggestion-does.md)).
- Removal takes no reason — the fixed list is a rejection's — and its response
  is the beer as decided, `200`, as a decision's is
  ([task 06](06-an-admin-approves-or-rejects-a-suggestion.md)). It acts on a
  beer that is `APPROVED` and answers `409` for any other state, `404` for an
  unknown id.
- `BeerRemoved` carries `eventId`, `beerId` and `occurredAt` and nothing
  consumes it (ADR-0102); a removed imported beer has no contributor to name.

**Decided at refinement, 2026-11-04** (product owner; the second pass on
2026-11-05 checked this file against ADR-0102):

- **Rejections limit nothing** (SHOULD-80): neither a cooldown nor a count.
- **The cap's refusal stays the documented `429`,** and the add dialog's
  message says that pending suggestions count, with no date for when room
  frees; the wording is drafted in the PR.
- *Derived:* **no operator path stays** — removal is in the admin API.

**Decided at refinement, 2026-11-05** (product owner):

- **An admin may remove any `APPROVED` beer, imported and seeded ones
  included,** which the script could not: it acted on a contributor's rows
  alone. Limiting removal to contributed beers was rejected, since an imported
  beer can be wrong too. Imported rows are shared test data, so a test removes
  a beer it created itself and never one another spec searches for.

## Open questions

**None.**

## Acceptance criteria

- [ ] `make moderate`, its script, `ContributionModerationIT` and every
      reference to them are gone — a search of the repository for
      `make moderate` and `moderate-contributor` finds them only in finished
      task files, the quality backlog's lifted entries and ADR amendment notes
      that name the retirement, and `make check` passes
- [ ] An integration test through the admin API pins that no catalog row is
      deleted by a rejection or a removal, and that a holder's cellar entry for
      the beer remains and renders unlinked
- [ ] An integration test shows a beer with a new brewery counting once against
      the cap of 20, and was confirmed to fail before the change
- [ ] The add dialog's cap message speaks of pending suggestions, in both
      locales — component test
- [ ] An integration test removes an approved beer — a contributed one and an
      imported one — through the admin API with the effects ADR-0091 states,
      leaving its brewery as it was, writing a review record with no reason
      and publishing exactly one `BeerRemoved`, and a non-admin's removal is
      refused `403`
- [ ] Removing a beer that is not `APPROVED` (pending, rejected or already
      removed) answers `409` `problem+json` and publishes nothing — test
- [ ] ADR-0091, ADR-0100, `backend/README.md`, `docs/architecture.md`, the
      glossary and the backlog describe the admin path instead of the script,
      and the committed spec carries the removal with its `403`, `404` and
      `409` responses
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-80 and COULD-99,
both returned from iteration 10 by the product owner on 2026-11-01 to be fixed
with the admin page. SHOULD-80's script half is fixed here; its rejection half
went back to the quality backlog at refinement on 2026-11-04.
