# ADR-0012: orval-generated API client from the backend's OpenAPI spec

- **Status:** accepted
- **Date:** 2026-07-22

## Context

The frontend hand-wrote both its API-call functions (`features/catalog/api.ts`)
and the DTO shapes they returned (`features/catalog/types.ts`) — duplicating
the backend's contract by hand, with nothing to catch drift between the two.
Iteration 2 task 6 makes the backend's OpenAPI spec the source of truth
instead. Product owner proposed `openapi-generator-cli`; this ADR records
the alternative chosen and why, and the workflow for keeping the generated
client in sync.

## Decision

- **Tool: [orval](https://orval.dev) 8.22.0**, not `openapi-generator-cli`.
  Pure Node/TypeScript (no JVM dependency in frontend tooling), and it
  generates TanStack Query hooks directly from the spec — a direct fit with
  [ADR-0008](0008-tanstack-query.md), which already made TanStack Query the
  mandatory client-component data layer. `openapi-generator-cli` would still
  need a hand-written hook layer on top of its generic client.
- **Spec source: a live backend**, not a committed static spec file. A
  static file is exactly the kind of artifact that goes stale silently —
  the opposite of this project's premise. `orval.config.ts` points at
  `http://localhost:8080/v3/api-docs` by default (`KALIA_OPENAPI_URL`
  overrides it); `npm run generate:api` regenerates against a running
  backend (`docker compose up -d backend postgres`).
- **Generated output is committed** (`frontend/lib/api/generated/`) so
  `npm install && npm run build` needs no live backend. A new CI job,
  **`api-client-drift`**, starts the backend, regenerates, and runs
  `git diff --exit-code` against the committed output — failing the build
  the moment the API and the generated client disagree. Verified working
  both ways: confirmed clean on a real regeneration, and confirmed it fails
  when a stale line is hand-appended to generated output.
- **A custom fetch mutator** (`lib/api/mutator.ts`, `kaliaFetch`) is
  required — orval's stock fetch client does not parse JSON at all (it
  returns the raw response text, uncast). The mutator adds the backend base
  URL and parses JSON, tolerating a body-less non-2xx response instead of
  throwing (verified: an empty-bodied 404 resolves to `data: null` rather
  than crashing on `JSON.parse`).
- **`features/catalog/api.ts` and `types.ts` are migrated now**, not
  install-only: the hand-written types already duplicated the backend DTOs,
  a real drift risk this task could fix directly, and migrating now proves
  the generated client actually works rather than shipping untested
  tooling. `types.ts` re-exports the generated model types under its
  existing names, so every consumer (`BeerList`, `SearchFilters`,
  `Pagination`, `BeerDetailsCard`, both catalog pages) needed zero changes
  beyond one signature (`breweryLocation`'s `city` parameter — see below).
  `api.ts` keeps its existing `searchBeers`/`getBeer` signatures, now
  implemented by converting to/from the generated client's types
  underneath.

## Two backend correctness gaps this surfaced, and fixed

Generating a real client immediately exposed two gaps between the DTOs and
what springdoc/Jackson actually produced — both are backend fixes, made and
verified in this same PR before the frontend migration continued:

1. **Every field defaulted to optional in the generated schema**, including
   fields the backend always populates. springdoc does not infer `required`
   from a Java field's non-nullability (nor from primitives, nor from the
   absence of `@Nullable`) — it needs an explicit
   `@Schema(requiredMode = REQUIRED)`. Added to every non-`@Nullable`
   component across the five catalog web DTOs; a new
   `OpenApiDocumentationIT` test pins the schema's `required` array.
2. **No Jackson `default-property-inclusion` was configured**, so a null
   field serialized as literal `"city": null` rather than being omitted.
   That would have made the generated `city?: string` type (absent key =
   no city) unsound — a present key with a `null` value doesn't match
   "absent". Fixed with `spring.jackson.default-property-inclusion=non_null`
   globally; a new `DtoSerializationIT` (`@JsonTest`) pins the omission
   behavior directly, without needing a live null-value fixture in seed data.

## Consequences

- Future modules (cellar, identity) get generated clients "for free" the
  same way — one `orval.config.ts` project entry each, or extend `kalia`'s
  `input.target` once cellar's endpoints exist under the same OpenAPI doc.
- The two backend fixes apply to every DTO added going forward, not just
  catalog's — the convention (explicit `requiredMode`, non_null Jackson
  inclusion) is now the default posture, not catalog-specific.
- Known gap, not fixed here: non-200 responses (404, 400) aren't documented
  via `@ApiResponse` in the OpenAPI spec, so the generated response types
  are optimistic (`status: 200` only) even though the mutator handles real
  runtime status codes correctly. Revisit if/when a consumer needs typed
  error responses rather than the current status-code check + throw.
