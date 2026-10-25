# Task 20: Three small things that show the wrong thing are fixed

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**An unlisted country code shows the error page.** `frontend/features/catalog/searchParams.ts:10`
and `:49` accept any `[A-Z]{2}`. The backend refuses an unlisted one with 400
(`backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:35-38`),
`frontend/features/catalog/api.ts:36-37` throws, and `/en/beers?countryCode=ZZ`
falls to `app/[locale]/error.tsx` — where
[iteration-8 task 08](../iteration-8/08-catalog-search-bounded-end-to-end.md)
promised an "ignored filter" note. `e2e/search-bounds.spec.ts` tests only
`countryCode=belgium`, which fails the format check first.

**Feed timestamps never update.** `frontend/features/feed/FeedList.tsx:36`
fixes `renderedAt` once and passes it to every row (`:226`), including rows
polled in later, and `formatRelativeInstant` clamps a negative age to zero
(`lib/relativeInstant.ts:26`). A line polled in three hours after load says
"just now", and older lines never age.

**Event times ignore the injected `Clock`.** Bottle dates are checked against
it (`cellar/domain/Bottle.java:88-96`), but `BottleAdded.occurredAt`
(`cellar/domain/Entry.java:90`), `touch()` (`:125`) and the feed's 30-day cutoff
(`feed/application/FeedService.java:74`, `:105`) call `Instant.now()`, so a test
with a fixed clock still gets real-time events and cannot pin the feed window.
`touch()` also duplicates `@UpdateTimestamp` on the same field
(`Entry.java:52-53`).

## Scope

A well-formed but unlisted country code is ignored with the note, not an error
page. A feed line's relative time is right when it appears and stays right as
the page sits open. Every domain timestamp reads the injected `Clock`.

## Constraints

- [ADR-0042](../../adr/0042-bounded-request-parameters.md) and iteration-8
  task 08: a value the API would refuse never reaches it from the search form.
- [ADR-0079](../../adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md):
  the country list is `GET /countries`.
- The `Clock` bean and its UTC zone are `ApplicationConfig`'s
  ([iteration-8 task 15](../iteration-8/15-backend-services-own-their-cross-cutting-setup.md)).

**Decided at refinement, 2026-10-24** (product owner):

- **A refused filter is shown as ignored:** the catalog page treats the search's 400 for a filter value as the existing ignored-filter note over unfiltered results. Validating against `GET /countries` and an empty-page API change were rejected.
- **Feed ages refresh on each poll**, every 15 seconds, from the current time; no separate timer.

## Open questions

**None.**

## Acceptance criteria

- [x] `/en/beers?countryCode=ZZ` shows the catalog with the ignored-filter note
      — an e2e case added to `search-bounds.spec.ts`, confirmed to fail today
- [x] A line polled in after load shows its own age, and an older line's age
      advances — vitest tests with fake timers
- [x] A test with a fixed `Clock` gets that clock's instant on `BottleAdded`
      and in the feed cutoff — unit tests
- [x] `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-65, COULD-36 and
COULD-60. Merged as small, independent fixes of things a user or a test sees
wrongly; each could be its own commit.
