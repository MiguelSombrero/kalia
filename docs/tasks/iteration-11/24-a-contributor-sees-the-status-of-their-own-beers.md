# Task 24: A contributor sees the status of their own beers

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-3

## Why

A signed-in contributor's own `PENDING` beer appears in the catalog and answers
the details read, to nobody else
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
Neither response says so: a beer in the list and a beer's details carry an id,
name, style, strength and brewery, and nothing tells a client whether a row is
approved or waiting. The product owner settled that the app marks a
contributor's own pending beer in the list and on its page
([task 09](09-catalog-search-and-list.md), [task 10](10-beer-details.md)), and
that cannot be built on the app alone. The web does not mark one either.

A beer that is `REJECTED` or `REMOVED` is withheld from its contributor too
(ADR-0091, "Withdrawn"), so the only beer a reader can see that is not
approved is their own pending one.

## Scope

A beer's entry in a catalog search and its details say whether it is approved or
waiting for review. The field is additive, the spec and both generated clients
are regenerated, and what the web shows is unchanged.

## Non-goals

- The web showing the status, and the app showing it — [task 09](09-catalog-search-and-list.md)
  and [task 10](10-beer-details.md) draw it.
- A withdrawn beer, which stays `404`; the admin responses; the cellar's own
  `withdrawn` flag.

## Constraints

- The API is additive-only while an app is installed, and the committed spec
  fails a breaking diff
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
  The field is required in the response, so a client generated from the new spec
  reads it without a guard.
- The field is typed to the two values a read can carry, `APPROVED` and
  `PENDING`, not to the storage enum, which would promise values the read never
  returns — the lesson of [task 18](18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)'s
  review-decision response. A client still falls back on a value it does not
  know.
- The generated client is read-only
  ([ADR-0012](../../adr/0012-orval-api-client.md)); it is regenerated.
- Nothing that decides who sees a beer changes: the field reports a row the
  reader already sees.

**Decided at refinement, 2026-11-12** (product owner):

- **A separate backend task, ahead of 09 and 10,** and not folded into the
  app's tasks, so each pull request is one thing and neither screen builds
  against a response it does not have.

## Open questions

**None.**

## Acceptance criteria

- [ ] A backend integration test shows a catalog search returning `PENDING` for
      the contributor's own waiting beer and `APPROVED` for an approved one, and
      failed before the field existed
- [ ] A backend integration test shows the details read answering the same for
      both, and no other reader, anonymous included, ever receiving `PENDING`
- [ ] The committed spec is regenerated, `make openapi-spec` shows an additive
      diff and no breaking one, and both clients' generated types are
      regenerated and compile
- [ ] ADR-0091 carries an amendment saying the beer reads report the status
- [ ] `make verify` is green

## Notes

Found while refining task 09 and 10 on 2026-11-12: `BeerSummaryDto` and
`BeerDetailsDto` carry no status, though both tasks' settled behaviour needs it.
