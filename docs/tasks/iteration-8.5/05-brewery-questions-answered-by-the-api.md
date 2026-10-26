# Task 05: The API answers the add-beer form's questions itself

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

Two of the add-beer form's answers are worked out in the web client from
data the API was not built to give, so a second client would have to copy the
workaround or go without:

**A duplicate brewery is named from a search, not by its id.** The add-beer
`409` for a brewery carries only `existingBreweryId`
(`CatalogExceptionHandler.java:37-42`), and the API has no read of one
brewery, so `addBeerAction` (`frontend/features/catalog/actions.ts:96-105`)
searches the typed name, 8 results at most, and falls back to the visitor's
own typing when the folded name matches a differently spelled one
("Ruosniemen-Panimo" against "Ruosniemen Panimo"). The error box and *Use it*
then show the visitor's spelling rather than the catalog's
([ADR-0082](../../adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)).

**The similar-beers hint reads only a brewery's first 100 beers.**
`listBreweryBeers` (`frontend/features/catalog/api.ts:121-128`) takes one page
at the search API's size cap, sorted by name, and `similarlyNamed`
(`features/catalog/similarNames.ts:18-33`) filters it client-side. A Wikidata
brewery with more beers loses the hint for every name past the hundredth.

## Scope

A duplicate brewery is named exactly as the catalog holds it. The similar-
beers hint considers every beer of the brewery. Both answers come from the
API, so the web client's workarounds go.

## Non-goals

- Changing when a beer or brewery counts as a duplicate — iteration 8 task 02.
- The brewery list's own cost — [task 15](15-catalog-reads-hold-at-imported-size.md).

## Constraints

- [ADR-0042](../../adr/0042-bounded-request-parameters.md): every new request
  parameter is bounded by named constants.
- [ADR-0082](../../adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)
  sets what the form shows; this task changes where its facts come from.
- [Task 01](01-api-errors-complete-and-typed.md) decides how a `409`'s extra
  fields are declared; a brewery's name in the `409` follows that decision.
- Additive only, so iteration 9's policy needs no exception.

**Decided at refinement, 2026-10-24** (product owner):

- **The duplicate brewery is named in the `409` itself:** its declared schema carries the brewery's id, name and country — decided in [task 01](01-api-errors-complete-and-typed.md), whose schema it is. No `GET /breweries/{id}`.
- **The similar-beers hint becomes a brewery-scoped search** by any word of the typed name, done server-side and bounded per ADR-0042; the client shows what it returns.

## Open questions

**None.**

## Acceptance criteria

- [x] A duplicate brewery whose spelling differs from the typed one is named
      with the catalog's spelling — `npm test` covers the "Ruosniemen-Panimo"
      case, and an integration test covers the backend answer
- [x] The similar-beers hint finds a match past a brewery's hundredth beer —
      covered by a test against a fixture brewery with more than 100 beers
- [x] The web client no longer searches by the typed name to name a
      duplicate, and `make verify` is green

## Notes

Provenance: [backlog](../backlog.md) "A duplicate brewery is named from a
search, not by its id" and "The add-beer form's similar-beers hint reads only a
brewery's first 100 beers".
