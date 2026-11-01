# Task 15: A rejected or removed beer is treated the same way everywhere

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
keeps a contributed beer out of public view until an operator approves it,
and never deletes a catalog row. What happens to a beer an operator *rejects*
or *removes* is answered three different ways:

- Someone who already holds such a beer can keep adding bottles to it.
  `CellarService.entryFor` checks `catalog.beerExists` only when no entry
  exists, against ADR-0091's "adding to a cellar" visibility rule, and each
  add writes a public feed line. `ContributionModerationIT` tests only a user
  with no entry (SHOULD-75).
- Rejecting a pending beer publishes what review withheld. While it is
  `PENDING`, the contributor's feed lines and public-cellar entry for it are
  hidden, but `CatalogService.getBeerSummaries` withholds only `PENDING`, so
  after `make moderate ACTION=reject` they appear — and
  `ContributionModerationIT` pins that (SHOULD-76).
- A rejected or removed beer shows in the cellar entries and feed lines that
  point at it, but its details page 404s, because `CatalogService.getBeer`
  admits only approved rows and the viewer's own pending ones. The link is a
  dead end (SHOULD-92).

The mobile catalog and cellar ([iterations 11](../iteration-11.md) and
[12](../iteration-12.md)) will inherit whichever answer the API gives, and an
installed app cannot be redeployed with a correction.

## Scope

For a beer that is `REJECTED` or `REMOVED`, one rule decides — and the API
applies everywhere — whether it can be added to, whether it appears in public
reads, and what its details link leads to.

## Constraints

- ADR-0091 is amended, not contradicted, where the rule changes what it
  states ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- No catalog row is ever deleted (ADR-0091).
- [ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md):
  a new status or field on a response is additive; a new refusal on an
  existing operation is a contract change to document.

**Decided at refinement, 2026-11-01** (product owner):

- **`REJECTED` and `REMOVED` follow one rule: withheld everywhere.**
- **A holder keeps the bottles they have** — no row is deleted — **but cannot
  add another.** The add is refused with the error it already documents for a
  beer that does not exist, so no new status reaches the contract.
- **Public reads withhold it,** as they withhold `PENDING`: no feed line and no
  public-cellar entry, before or after a rejection. Rejecting no longer
  publishes what review held back, and `ContributionModerationIT`'s pinned
  assertion changes with it.
- **In the owner's own cellar it shows unlinked, with a note** that it was
  withdrawn from the catalog, in both locales — the wording drafted in the PR
  for review. The cellar read carries what the client needs to tell, as an
  additive field ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] `ContributionModerationIT` covers a holder adding to, and reading the
      public views of, a rejected and a removed beer, and asserts the rule
      refinement chose; the changed assertions failed before the fix
- [ ] A test of the web's cellar shows a withheld beer unlinked, with the
      withdrawn note in both locales
- [ ] ADR-0091 states the rule for both statuses
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-75 and SHOULD-76,
both `[needs decision]` (open questions 1 and 2), and SHOULD-92, deferred in
PR #452.
