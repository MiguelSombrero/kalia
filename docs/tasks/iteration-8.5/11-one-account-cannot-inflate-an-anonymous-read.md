# Task 11: One account cannot make an anonymous read arbitrarily expensive

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

`AddBottleRequestDto.java:22-29` caps one request at 24 bottles, but nothing
caps a user's entries or bottles. Both the owner's `GET /cellar`
(`CellarController.java:51-55`, "Not paginated") and the anonymous
`GET /api/v1/cellars/{username}` (`PublicCellarController.java:56-61` →
`CellarService.java:45-48`) load every entry with every bottle
(`EntryRepository.java:18-20`), then make one catalog query per 100 beers
(`CatalogApi.java:28-34`).

An account that scripts adds — self-registration is unthrottled until
[task 10](10-unauthenticated-edges-throttled.md) lands — and makes its cellar
public turns that URL into a multi-megabyte anonymous response anyone can
request in a loop. Each add also puts a `BottleAdded` line on the anonymous
front-page feed every visitor sees. [ADR-0042](../../adr/0042-bounded-request-parameters.md)
bounds every request parameter, and
[ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
bounded the number of calls, but nothing bounds the size of the answer.

## Scope

The cost of any anonymous read of one user's data has an upper bound that
does not depend on what that user chose to store. The public cellar page pages
through a large cellar.

## Non-goals

- Request-rate limiting — [task 10](10-unauthenticated-edges-throttled.md).
- Offline sync's needs from the owner's read — iteration 12, though a paginated
  owner read would change what it caches.

## Constraints

- [ADR-0050](../../adr/0050-public-cellar-addressing.md): a public cellar's
  address.
- [ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md) and
  [ADR-0058](../../adr/0058-feed-event-recording-model.md): what the feed records
  and shows.
- [ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md):
  the cellar page sorts its beers client-side today; paginating changes that.
- A pagination change to `/api/v1` is additive only if the unpaged form stays
  valid — iteration 9's policy.

**Decided at refinement, 2026-10-24** (product owner):

- **The anonymous public-cellar read is paginated**, additively: an unpaged request gets a default first page. The owner's own read stays whole, for iteration 12's offline cache, bounded by request rate only.
- **The feed is unchanged:** one owner's burst is left to the proxy's rate limit and task 12's limits. Collapsing or capping lines per owner was rejected.

## Open questions

**None.**

## Acceptance criteria

- [x] An integration test seeding a cellar past the bound shows the anonymous
      read's response size and query count stay within it
- [x] The public read's paging parameters are bounded per ADR-0042, an
      unpaged request gets the default first page, and both are documented in
      the spec — integration tests
- [x] The cellar page still works across the bound — e2e green — and `make
      verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-66.
