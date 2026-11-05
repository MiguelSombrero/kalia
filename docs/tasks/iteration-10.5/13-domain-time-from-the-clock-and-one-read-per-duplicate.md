# Task 13: Domain timestamps come from the Clock, and a duplicate brewery is read once

- **Status:** done
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

The application has one `Clock`, in UTC, that the cellar's timestamps,
`BottleAdded.occurredAt` and the feed's 30-day window read rather than the
system time ([architecture §3](../../architecture.md#3-backend-modules)).
[Iteration 8.5 task 20](../iteration-8.5/20-small-correctness-fixes.md) moved
the cellar onto it, and five places still bypass it (COULD-79):
`Instant.now()` in `catalog/domain/Beer.java`, `Brewery.java` and
`EventPublicationResubmission.java`, and Hibernate's VM-sourced
`@CreationTimestamp`/`@UpdateTimestamp` in `Profile.java` and `FeedLine.java`.
A test that fixes the clock cannot fix those, and this iteration adds review
timestamps beside `Beer` and `Brewery`'s — the moment to stop the pattern
spreading is before [task 06](06-an-admin-approves-or-rejects-a-suggestion.md)
copies it.

[Task 07](07-an-admin-edits-a-suggestion-before-approving-it.md) runs the
add path's duplicate check a second time for an edit, and that check reads the
duplicate brewery twice: `ContributionService.newBrewery` finds its id with
`findIdBySameNameAndCountryCode`, then loads the row with `findById` for the
name and country the `409` carries (COULD-98).

## Scope

Every domain timestamp in the backend is taken from the injected `Clock`, and
a test with a fixed clock shows it for each; the duplicate-brewery path reads
the brewery once.

## Constraints

- No schema change is needed for either; if one turns out to be, it is a new
  Flyway migration owned by the schema-owning role
  ([ADR-0100](../../adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)).
- A domain entity takes the time as an argument or from the factory that
  creates it; it does not reach for a bean.
- The `409`'s body stays as documented
  ([iteration 8.5 task 05](../iteration-8.5/05-brewery-questions-answered-by-the-api.md)).

**Decided at refinement, 2026-11-04** (product owner):

- **`EventPublicationResubmission` is in scope:** its cutoff reads the
  injected `Clock`, so no system-time read is left in `backend/src/main/java`.

## Open questions

**None.**

## Acceptance criteria

- [x] A test per entity — `Beer`, `Brewery`, `Profile`, `FeedLine` — creates
      it under a fixed `Clock` and reads that instant back; each failed before
      the change
- [x] A test of the duplicate-brewery path counts one query for the brewery
      (Hibernate statistics or a repository spy), and failed before
- [x] `EventPublicationResubmission`'s cutoff moves with a fixed `Clock` — test
- [x] `grep` finds no `Instant.now()` or VM-sourced timestamp annotation left in
      `backend/src/main/java`, and §3 says so
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-79 and COULD-98
(deferred in PR #425). Run before tasks 06 and 07, which build on both.
