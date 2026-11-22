# Task 22: The clients take the backend's bounds from one place

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

The backend's request bounds are copied by hand into both clients and into the
web twice. `web/features/catalog/searchParams.ts` (`MAX_ABV`,
`MAX_FILTER_LENGTH`, `MAX_PAGE_SIZE`, `MAX_OFFSET`),
`mobile/src/features/catalog/filters/model.ts` (`MAX_ABV`, `MAX_FILTER_LENGTH`)
and `mobile/src/features/catalog/api.ts` (`MAX_RESULT_WINDOW`) restate
`PageBounds` and `CatalogController`. `backend/openapi.json` states the bounds
(`maxLength`, `maximum`), but the generated models keep them only as JSDoc. A
changed bound drifts in as many places as copies, each client then answering
`400` or stopping its paging early on its own (SHOULD-126).

Two near-copies make it worse on the web. `web/features/catalog/addBeerSchema.ts`
and `web/features/admin-suggestions/editSuggestionSchema.ts` carry the same
seven bounds and patterns and the same `checkName`, `checkAbv` and `toNumber`,
differing only in the message-key prefix and the form's value type; a bound
changed in one lets the admin form accept what the add form refuses, or the
reverse (SHOULD-122). The UUID pattern guarding "can this id name a row" is
written four times, in the web's catalog `api.ts` and `actions.ts`, the web's
cellar `actions.ts` and the phone's catalog `api.ts` (COULD-145).

The phone's bottle form is about to add its own bounds
([task 06](06-design-the-bottle-form.md),
[task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md)): a quantity of up
to 24, two dates. Without one home, that is a fifth copy.

## Scope

- One home for the request bounds and the id pattern both clients use, exported
  from `@kalia/api` and imported by the web and the phone.
- A test that reads the committed `backend/openapi.json` and fails when a
  constant no longer matches the bound the spec states.
- The web's two beer-form schemas share one definition of the bounds, the
  patterns and the checks, and differ only in their message keys and value
  type.
- The cellar's quantity bound is in it, so the phone's form
  ([task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md)) imports it.

## Non-goals

- Generating the constants or the validation schemas from the spec. Decided
  against: the generated client is read-only
  ([ADR-0012](../../adr/0012-orval-api-client.md)), and the guard test gives the
  same protection for less.
- Strength formatting, which both clients also copy (COULD-153): a display
  rule, not a bound.
- Moving the server's validation. The server stays the authority
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)).

## Constraints

- **The shared packages export what both apps use and only that**
  ([iteration 11.5 task 13](../iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md)).
  A bound only one client reads stays with it.
- **`@kalia/api`'s generated directory is read-only** (ADR-0012); the constants
  are hand-kept beside it.
- **The guard test reads the committed spec,** which is what the breaking-diff
  check already holds to the backend
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  so it needs no running backend.
- A bound that has no home in the spec — a pattern the backend checks with its
  own annotation — is called out, not silently left a copy.
- **Decided when the finding was lifted (2026-11-22):** hand-kept constants in
  `@kalia/api`, guarded by a test against the spec; not generated, not left as
  per-client copies.

## Open questions

- **Domain and data model.** Which bounds the spec states (`maximum`,
  `maxLength`, `pattern`) and which only a Java annotation holds, so the guard
  test can cover the first and the second is named as unguarded.
- **Module boundaries.** The constants' file and name inside `@kalia/api`, and
  whether the import goes through its root or a subpath, given the iteration
  11.5 rule that a consumer imports the narrowest path.
- **Completion signals.** Whether the guard test also fails for a bound the spec
  gains that no client yet imports, or only for one that disagrees.

## Acceptance criteria

- [ ] A test compares each exported bound to `backend/openapi.json` and fails
      when one is changed, confirmed by changing a constant and watching it fail
- [ ] A grep of `web/` and `mobile/` finds none of the bounds and no UUID
      pattern written out outside `@kalia/api`, checked by a lint rule or a test
- [ ] The web's add-beer and admin edit-suggestion forms share one
      definition, and their existing tests pass unchanged
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-126
(`[needs decision]`, settled when lifted), SHOULD-122 and COULD-145.
