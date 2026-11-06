# Task 20: An anticipated failure gets the documented answer

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

Four places answer an anticipated failure with a `500` or a dead end, and a
`500` is logged and counted as an unexpected failure
([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

- **`GET /api/v1/cellar/holdings`** (SHOULD-104) answers 500 to
  `?beerIds=<uuid>,` (a trailing comma), `?beerIds=,` or
  `?beerIds=&beerIds=<uuid>`: Spring converts a blank element to `null`, `@Size`
  on `List<UUID>` lets it through, and `Set.copyOf` throws. A malformed request
  is logged as a failure. Iteration 12's cellar reads this endpoint.
- **An admin's edit that renames a pending brewery or beer** (COULD-133) has no
  retry on a unique-index race. It passes its duplicate read, a contributor's
  add of the same name commits first, and the flush answers `500` where the add
  path retries once and answers the documented `409`
  ([ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)).
- **Proposing a new brewery whose name and country another contributor holds as
  `PENDING`** (SHOULD-102) answers `DuplicateBreweryProblem` with that brewery's
  id, name and country, and the add-beer dialog offers "Use it"; choosing it
  answers `404`, because the row is hidden — the dead end SHOULD-72 closed for
  beers. `ContributionService.newBrewery` has the same lookup as
  `existingBrewery` without the visibility check.
- **The web's add-beer action** (COULD-118) holds a valid `409` with
  `existingBeerId`, then awaits `getBeer` uncaught to look up its name; when that
  read fails or times out, the dialog shows the generic failure instead of "this
  beer exists".

## Scope

Each is answered as documented: a `400` on `beerIds` for a blank element, the
documented `409` for the edit's race, an anonymous `409` for a brewery held as
pending (or a recorded decision that its name may be disclosed), and the dialog
falling back to "this beer exists" without a name.

## Non-goals

- The queue's other states, or a new limit on suggestions (SHOULD-80).
- Cellar behaviour beyond the validation of this endpoint.

## Constraints

- The race test forces the interleaving it checks and passes the repeat target
  of [task 14](14-concurrency-tests-force-the-interleaving-they-check.md) — that
  task lands first.
- A withheld row is withheld everywhere
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md),
  [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)).
- Every request parameter is bounded and named
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)); a change to the
  spec is additive
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- A Server Action makes at most the backend calls
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
  allows; the fallback adds none.

## Open questions

- **Domain.** For the brewery: the anonymous `409` the beer path answers, or a
  decision that a brewery's name may be disclosed and "Use it" must then work.
- **Interaction and UX.** What the dialog says when it has the `409` but not
  the beer's name; wording in `en` and `fi`.

## Acceptance criteria

- [ ] `CellarHoldingsApiIT` covers the trailing comma, a lone comma and a blank
      repeated parameter, each answering `400` naming `beerIds`, and failed before
- [ ] A test forces a contributor's add to commit between an admin edit's
      duplicate read and its flush, and shows the documented `409`; it passes the
      repeat target
- [ ] A test shows a brewery held as `PENDING` by another contributor answering
      as the decision says, and the dialog offering nothing that answers `404`
- [ ] A component test shows the add-beer dialog saying the beer exists when
      `getBeer` fails, and failed before
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-102, SHOULD-104,
COULD-118 and COULD-133. SHOULD-102 was found in
[iteration 10 task 16](../iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
