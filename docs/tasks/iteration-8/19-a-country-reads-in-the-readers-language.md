# Task 19: A brewery's country reads in the reader's language

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

A Finnish reader of a Swedish beer's page reads "kaikki maasta Sweden". A
brewery's country is stored as one English string, and that string is also
the catalog filter's URL value and the text every reader sees. The country
filter is a free-text box, so it matches only a reader who types that English
string, spelled as the import spelled it ("People's Republic of China", not
"China" or "Kiina").

The catalog grew to about 4.9k breweries in 102 countries with the Wikidata
import, and users now add breweries of their own
([task 02](02-add-beer-api.md)). That is the scale at which an untranslated
country stops being a rare oversight and becomes what most beer pages show.

## Scope

- Every brewery's country is stored as an ISO 3166-1 alpha-2 code: seeded,
  imported and user-added breweries alike. No English country name is stored
  anywhere in the catalog.
- The Wikidata import emits codes. The 44 breweries whose imported country has
  no code are given the present-day country decided in
  [ADR-0079](../../adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md),
  from a hand-reviewed mapping committed beside the snapshot. A re-import that
  meets a codeless country the mapping does not cover stops and names it.
- The API carries the code as `countryCode`: on every brewery a response
  embeds, as the search filter parameter, and in the add-a-beer request's new
  brewery. Brewery duplicate detection compares the folded name and the code.
- A new public read lists the countries the catalog has breweries in, as
  codes.
- On a beer's page, both places that show the brewery's country (its
  location, and the "all from" link) name it in the reader's language.
- The catalog's country filter becomes a select of the countries the catalog
  has breweries in. Each is named in the reader's language and sorted by that
  language's order, and the filter link carries the code.

## Non-goals

- Translating beer styles or anything else that is catalog data rather than
  interface copy.
- Showing the historical state a brewery stood in. ADR-0079 decides that a
  brewery shows the country where it stood, as it is today.
- A country of its own for Wales or any other constituent country. They have
  no ISO 3166-1 code, and the United Kingdom is their country here.
- Redirecting old `?country=Sweden` links. Nothing outside this repository
  links to the app yet.

## Constraints

- [ADR-0079](../../adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md)
  binds the stored form, the wire name, how clients name a country, and the
  per-brewery mapping of the 44 codeless breweries.
- **`V008` is generated and never hand-edited, and `V004` stays unchanged**
  ([ADR-0077](../../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)).
  The seeded breweries therefore get their codes without editing `V004`.
  Schema changes go into `V003`
  ([ADR-0036](../../adr/0036-pre-deployment-migration-edits.md)), and a local
  database then needs `docker compose down -v`.
- The country filter keeps an index the planner uses
  ([ADR-0044](../../adr/0044-catalog-search-indexes.md)).
  `BeerSearchIndexIT.countryFilterUsesTheCaseInsensitiveIndex` asserts the
  index that `lower(country)` uses today, so it moves to whatever index the
  code filter uses rather than being deleted.
- The `countryCode` filter parameter is bounded like every other parameter
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)). A value that is
  not a listed country is refused with `400` `problem+json`; it is not treated
  as a filter that matches nothing.
- Country names are rendered on the server, by `Intl.DisplayNames` for the
  page's locale (ADR-0079's Bad consequence). The filter's options are sorted
  with the same locale's collation.
- **Do not trust memory about the Next.js version this app uses** — check
  `frontend/node_modules/next/dist/docs/` first (`CLAUDE.md`).
- This builds on [task 02](02-add-beer-api.md), whose `Country` list already
  pairs each name with its code. [Task 03](03-add-beer-ui.md)'s form then
  picks a new brewery's country by code, named in the reader's language.
- [Task 18](18-catalog-search-served-by-an-index-at-150k.md) indexes the same
  search. Whichever of the two lands second keeps the other's index
  assertions passing.

**Decided at refinement, 2026-10-22** (product owner):

- **The code is the only stored form.** Keeping the English name beside it
  was rejected: two columns for one fact.
- **The wire name is `countryCode`, field and parameter alike.** Keeping the
  name `country` with a code as its value was rejected: the change would be
  silent to a client typed only as a string.
- **The filter lists only countries the catalog has breweries in.** Listing
  all 249 was rejected: most choices would return nothing.
- **Each codeless brewery maps to the present-day country where it stood**,
  per brewery, as ADR-0079 lists. Mapping a former state wholesale to one
  successor was rejected, and so was dropping the breweries.

## Open questions

**None.**

## Acceptance criteria

- [x] Every brewery row, whether seeded, imported or added through the API,
      carries an ISO 3166-1 code from Kalia's country list, and no column
      holds an English country name — integration test against the migrated
      database
- [x] The 44 breweries that were codeless carry the countries ADR-0079 lists,
      and the generator stops on a codeless country its mapping lacks —
      `node --test scripts/*.test.mjs`, with `make check` confirming the
      committed `V008` matches the generator
- [x] A brewery in any response carries `countryCode` and no `country`;
      `GET /beers?countryCode=SE` returns exactly the beers of Swedish
      breweries; an unlisted code is refused with `400` `problem+json` —
      integration test
- [x] The countries-with-breweries read returns exactly the codes the catalog's
      breweries hold — integration test
- [x] Adding a beer with a new brewery takes `newBrewery.countryCode`, and a
      brewery with the same folded name and code is refused as a duplicate —
      integration test
- [x] The country filter is still served by an index —
      `BeerSearchIndexIT`
- [x] A Swedish brewery's beer page reads "Ruotsi" in Finnish and "Sweden" in
      English, in both the location and the "all from" link — component test,
      and seen in a browser in both locales
- [x] The country filter is a select of the catalog's countries, named and
      sorted in the reader's language, and choosing one narrows the results
      — component test, and Playwright covering a search filtered by country
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [x] `make verify` is green

## Notes

Raised by the product owner on 2026-10-22, reading "kaikki maasta sweden" on
a beer's page. The three ways to localise a country, and why this one was
chosen, are ADR-0079's.
