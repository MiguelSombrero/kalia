# Task 02: The API sheds what nobody uses before mobile freezes it

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

[Iteration 9](../iteration-9.md) adopts an API compatibility policy: `/api/v1`
changes become additive only, because an app-store client cannot be
redeployed in lockstep with the backend. From then on, removing a field or an
endpoint is a breaking change. Three parts of today's contract have no
production consumer, and one is a privacy surface:

- **`GET /api/v1/beers/batch`** (`CatalogController.java:114-123`, anonymous)
  has had no caller outside generated code since
  [ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
  moved the cellar join into the backend. Yet `docs/architecture.md:338` and the
  operation's own description still present it as how "a client enriching a
  list it holds (e.g. a cellar)" should join, against ADR-0083 and §5. It
  keeps a second beer-summary path alive (`CatalogService.getBeers`, `:53-55`,
  beside `getBeerSummaries`, `:57-62`) and a batch cap duplicated in
  `CatalogApi.java:17-19`.
- **`GET /api/v1/me`** (`IdentityController.java:28-36`) has no production
  consumer, only e2e and a mutator test, yet returns the caller's email and
  full name (`CurrentUser.java:8`), though
  [ADR-0071](../../adr/0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)
  says Kalia names people by username only.
- **A beer's `description`** is stored and exposed (`catalog.beer.description`,
  optional on `BeerDetailsDto`) but no page has shown it since iteration 7.5,
  and since iteration 8 no source fills it: V008 inserts none and user-added
  beers have none.

## Scope

Each of the three is either removed — column, field, endpoint, generated
client and docs together — or kept on purpose with its documentation matching
why. Nothing left in `/api/v1` is there by accident when iteration 9's policy
takes effect.

## Non-goals

- Writing the compatibility policy itself — iteration 9.
- The minimum search-term length (backlog): ADR-0078's 2026-10-24
  re-measurement put 1–2-character name queries at 144 ms p95 against 150k
  beers, inside the 300 ms budget, which removes the reason the item gave.

## Constraints

- [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md): until the
  first deployment, a schema change goes into the migration it belongs to.
- [ADR-0012](../../adr/0012-orval-api-client.md): regenerate and commit the
  client; `api-client-drift` must stay green.
- `PublicRoutesIT` and `docs/architecture.md` §6 list the public routes, and
  must agree after any removal.
- e2e specs that read `/me` (`sign-in-out.spec.ts`, `support/mailpit.ts`) get
  their facts another way rather than keeping the endpoint for tests.

**Decided at refinement, 2026-10-24** (product owner):

- **Remove `GET /api/v1/beers/batch`**, the beer-summary path only it used, and its duplicated cap; §4/§5 then agree with ADR-0083.
- **Remove `GET /api/v1/me`.** e2e gets the account's facts from its own fixture or Keycloak's admin API.
- **Remove `description`** — the column, the DTO field and the seed values together.
- **Drop the backlog's minimum-search-length item** as settled by ADR-0078's 2026-10-24 measurement; no API change. This task deletes it from `docs/tasks/backlog.md`, with the description item it delivers.

## Open questions

**None.**

## Acceptance criteria

- [x] Each removed endpoint answers 404 and is gone from `/v3/api-docs` and
      the generated client — pinned by an integration test, and `PublicRoutesIT`
      matches §6
- [x] A removed `description` is absent from the schema, the DTO and the spec,
      and the catalog `*DtoSerializationIT` still passes
- [x] e2e no longer depends on a removed endpoint — `npm run test:e2e` green
- [x] `docs/architecture.md`, the glossary and the backlog describe what
      remains, and `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-64 and COULD-40,
and [backlog](../backlog.md) items "A beer's description is stored but unused"
and "Minimum length for the catalog search term". Merged because each is a
contract change iteration 9's policy would forbid.
