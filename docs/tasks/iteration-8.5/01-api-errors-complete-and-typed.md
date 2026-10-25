# Task 01: Every API error is documented and typed as it is sent

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

Iteration 9 generates a second client, the mobile app, from the same OpenAPI
spec the web client is generated from. Today that spec misdescribes the
errors, in three ways a generated client inherits silently:

**Error bodies carry fields the spec types in the wrong place.** Every error
response is declared as plain `ProblemDetail`
(`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:134-149`).
Its generated type nests extension fields under `properties`
(`frontend/lib/api/generated/models/problemDetail.ts:15`), but `errors`,
`existingBeerId` and `existingBreweryId` arrive at the top level
(`CatalogExceptionHandler.java:33,40,63`, `web/GlobalExceptionHandler.java:51`).
The frontend hand-parses them (`frontend/features/catalog/api.ts:71-100`). The
field-error item is defined twice — `web/FieldErrorDto.java:3` and
`catalog/web/FieldViolationDto.java:3-4`, the second only to avoid a `catalog`
→ `web` edge — with the "Validation failed" detail duplicated
(`GlobalExceptionHandler.java:50`, `CatalogExceptionHandler.java:62`), so a
catalog 400 and a Bean Validation 400 can drift apart unnoticed.

**Most handlers document no response codes.** `POST /beers` does; the seven
GET handlers of `CatalogController`, `searchBeers` (`:80`) and `getBeer`
(`:108`) included, document none, against `backend/README.md`'s SpringDoc
convention. That gap was the precedent an agent copied in iteration 7.

**A 401 has no body.** Every other error is RFC 9457 `problem+json`
([ADR-0014](../../adr/0014-shared-exception-handling.md)), but Spring
Security's `BearerTokenAuthenticationEntryPoint` answers 401 (and 403) with
headers only (`SecurityConfig.java:61`). A mobile client calling Spring
directly parses every error itself.

**The guard against entities in error bodies cannot see them.**
`HttpBoundaryTest` matches only `@RequestMapping` handlers
(`backend/src/test/java/fi/kalia/HttpBoundaryTest.java:41-49`), not the five
`@RestControllerAdvice` classes, and iteration 8 began putting values into
`ProblemDetail.setProperty(...)` — the one path a return-type rule would
never see.

## Scope

Every error the API can send is in the spec with the shape it has on the
wire, and every handler documents its codes. A 401 or 403 is `problem+json`.
One definition of a field error serves every 400. Each error kind's extra
fields are a declared schema, covered by a guard that fails when a JPA entity
could reach the wire through it.

## Non-goals

- Changing which errors exist or when they occur.
- The mobile client's own error handling — iteration 9.

## Constraints

- [ADR-0014](../../adr/0014-shared-exception-handling.md): only explicitly
  designed exception types reach `detail`; module advice and
  `GlobalExceptionHandler` never handle the same type.
- **The 401 trap:** the entry point sets the `WWW-Authenticate` header RFC
  9110 requires. A naive `ProblemDetail` replacement drops it silently — the
  same defect ADR-0014 records for 405's `Allow`. A test pins body and header.
- `backend/README.md` traps: a handler with any `@ApiResponse` needs an
  explicit `@ResponseStatus`, or springdoc drops its success response.
- Spring Modulith module rules: a shared type must sit where the module rules
  allow every module to depend on it.
- [ADR-0012](../../adr/0012-orval-api-client.md): the generated client is
  regenerated and committed, and `api-client-drift` must stay green.

**Decided at refinement, 2026-10-24** (product owner):

- **Declared error schemas.** Each error kind with extra fields — validation, duplicate beer, duplicate brewery — gets its own declared problem schema, and one shared field-error type serves every 400, in a module every module may depend on. A springdoc customizer that only loosens `ProblemDetail` was rejected: it leaves the fields untyped in both clients.
- **The entity guard follows from that:** `HttpBoundaryTest` also covers `@ExceptionHandler` methods on `@RestControllerAdvice` classes, so a declared error type that could carry an entity fails the build, proven against an `archfixture` like the existing rules.
- **The duplicate-brewery schema carries the brewery's id, name and country** — [task 05](05-brewery-questions-answered-by-the-api.md)'s answer, decided here because it is this schema.
- **Recorded as an amendment to [ADR-0014](../../adr/0014-shared-exception-handling.md)**, naming the rejected customizer.

## Open questions

**None.**

## Acceptance criteria

- [x] An unauthenticated request to a protected route answers 401 with a
      `problem+json` body and keeps its `WWW-Authenticate` header — pinned by
      an integration test asserting both
- [x] The generated client types `errors`, `existingBeerId` and
      `existingBreweryId` where they arrive, and `features/catalog/api.ts` reads
      them without hand-parsing — `npm test` covers the duplicate-beer and
      validation paths
- [x] A catalog refusal and a Bean Validation failure produce the same
      field-error shape — one integration test asserts both against one type
- [x] Every handler in every controller documents its response codes, and a
      test over `/v3/api-docs` fails when an operation lists no error response
- [x] `HttpBoundaryTest` covers advice `@ExceptionHandler` methods, and fails
      against a committed `archfixture` whose declared error type carries an
      entity — `HttpBoundaryRulesRejectViolationsTest`
- [x] The duplicate-brewery `409` carries the brewery's id, name and country
      in its declared schema — an integration test
- [x] `make verify` is green, including `api-client-drift`

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-63, SHOULD-29 and
SHOULD-30, and [backlog](../backlog.md) "401 responses carry no body", which
[iteration 9](../iteration-9.md)'s "Mobile-readiness fixes" line also names.
Merged because each is a way the spec misdescribes an error.
