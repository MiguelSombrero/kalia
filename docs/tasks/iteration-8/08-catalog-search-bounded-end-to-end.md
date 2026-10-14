# Task 08: Catalog search never lands on the error page

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

**The catalog's own search form can produce a 400.** The ABV inputs
(`SearchFilters.tsx:89-112`) have no `max` and no check that min ≤ max. The
query input (`:36-42`) has no `maxLength`. `features/catalog/api.ts:44-54`
normalizes only `sort`. So min 8 with max 5, an ABV over 100, a query over 100
characters, or a hand-edited `page`, `size` or non-numeric ABV each reach
`CatalogController` as a 400. The visitor lands on `app/[locale]/error.tsx`,
whose Retry sends the same request and fails again. Search is where
[task 03](03-add-beer-ui.md)'s add-a-beer flow starts, so this is the path
iteration 8 sends every contributor down.

**The search API allows an anonymous `OFFSET 1_000_000`.** `MAX_PAGE` of
10,000 times `MAX_PAGE_SIZE` of 100 (`CatalogController.java:48-49`) is
allowed on a `permitAll` endpoint. The Javadoc says a request past that index
cannot land on real data, which holds only while the catalog has fewer than
about 10,001 beers. This iteration removes that limit. Each such request makes
Postgres run the trigram match and a `COUNT(*)`, then discard a million rows.

(Quality backlog SHOULD-36 and COULD-17.)

## Scope

Every value the search form can send, and every hand-edited search URL, gets
either a valid result page or a message on the search page, never the error
page. The API's page bound becomes one that fits real use.

## Non-goals

- Keyset pagination. It was considered and rejected; see Constraints.
- Rate limiting, which is quality backlog SHOULD-27 and still
  `[needs decision]`.
- A brewery filter. Its absence is documented wrongly (quality backlog
  MUST-12, [task 16](16-docs-describe-what-is-built.md)), but building one is
  future work per ADR-0069.

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**lower `MAX_PAGE`** to a bound sized for real use, because search narrows
results anyway. Keyset pagination and leaving the bound to rate limiting were
considered and rejected.

- Parameter bounds follow
  [ADR-0042](../../adr/0042-bounded-request-parameters.md), and a rejection
  stays an RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)). The API keeps
  refusing bad values; this task makes the UI stop sending them.
- `SearchFilters` is a native GET form and stays a server component
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md), `docs/architecture.md`
  §5). Validation that needs client JavaScript would reverse that.
- `GET /api/v1/breweries` shares `MAX_PAGE` (`CatalogController.java:64-65`).
  Whatever bound is chosen applies there too, or the two are split on purpose.
- Any message a user reads is bilingual
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Open questions

1. **What is the new `MAX_PAGE`?** It needs a number, and a reason that
   survives the catalog growing.
2. **What does a hand-edited bad value do: silently dropped or clamped, or a
   message on the search page?** Dropping is quiet. A message tells the
   visitor that their filter was ignored.
3. **Min greater than max: swap them, refuse, or show a message?** The browser
   can enforce `max` on a number input, but not "min ≤ max" without
   JavaScript.
4. **A page past the last one:** an empty result page with a link back, or a
   redirect to the last page?

## Acceptance criteria

- [ ] Min ABV greater than max, an ABV over 100, an over-long query, and a
      hand-edited non-numeric ABV, `page` or `size` each render the search
      page as question 2 decides, never `error.tsx` — Playwright spec covering
      each, confirmed to fail against today's build
- [ ] `features/catalog/api.ts` normalizes every search parameter it forwards,
      not only `sort` — vitest unit tests
- [ ] A page index past the new `MAX_PAGE` is refused with `problem+json`, and
      the bound is documented on the handler — integration test
- [ ] The search API's existing contract for valid parameters is unchanged —
      the existing `CatalogApiIT` suite passes unmodified
- [ ] `mvn clean verify`, `npm test` and `npm run test:e2e` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-36 and COULD-17,
both confirmed 2026-10-14. Merged because both are about one search request's
bounds, one on each side of the BFF. Iteration-7 task 14 left COULD-17 out on
purpose, and iteration-7 task 16 skipped SHOULD-36's parameters for lack of
evidence. This is that evidence.
