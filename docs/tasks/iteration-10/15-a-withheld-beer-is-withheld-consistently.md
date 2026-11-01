# Task 15: A rejected or removed beer is treated the same way everywhere

- **Status:** needs-refinement
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

## Open questions

1. **Adding to a withheld beer (SHOULD-75):** refuse the add for holders too,
   or amend ADR-0091 to allow a holder to keep adding.
2. **Public reads after a rejection (SHOULD-76):** keep `REJECTED` withheld
   from feed and public cellar like `PENDING`, or accept that rejection
   publishes and say so in ADR-0091.
3. **The details link (SHOULD-92):** a read-only details page for a beer the
   viewer holds, or no link to a withheld beer at all — and what the page or
   the entry says about it, in both locales.
4. **`REMOVED` versus `REJECTED`:** the same answer for both, or does removal
   (an approved beer taken down) differ from rejection?

## Acceptance criteria

- [ ] `ContributionModerationIT` covers a holder adding to, and reading the
      public views of, a rejected and a removed beer, and asserts the rule
      refinement chose; the changed assertions failed before the fix
- [ ] A test of the web's cellar or feed shows a withheld beer's link as
      refinement decides
- [ ] ADR-0091 states the rule for both statuses
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-75 and SHOULD-76,
both `[needs decision]` (open questions 1 and 2), and SHOULD-92, deferred in
PR #452.
