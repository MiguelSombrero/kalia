# Task 02: Cellar REST API, scoped to the signed-in user

- **Status:** done
- **Iteration:** [5](../iteration-5.md)

## Why

[Task 01](01-cellar-module-and-schema.md) gives the cellar a domain but no way
in. This task exposes it over HTTP — and is the first endpoint in the app that
is not public, so it is where "authenticated" stops being a plan and becomes
enforced behaviour.

The isolation requirement is the point of the task, not a detail of it: a
cellar that another user can read is worse than no cellar. It is called out
separately below because it lived only in the iteration's "Done when" before
this format, where no single task owned it.

## Scope

Authenticated HTTP access to the two-level cellar [task 01](01-cellar-module-and-schema.md)
builds: list the current user's cellar as entries, read one entry's bottles,
add a bottle of a catalog beer, update a bottle's details, remove a bottle.
Every one resolves the caller through `identity` and operates only on that
user's rows.

## Non-goals

- UI — [task 03](03-cellar-frontend.md).
- Reading someone else's cellar. Public cellars are real and coming, but they
  are a visibility model this task has no input for —
  [iteration 6](../iteration-6.md) owns them. Until then every cellar endpoint
  answers for the caller and nobody else.

## Constraints

- Controllers live in `cellar.web` and depend only on `cellar.application`
  ([ADR-0007](../../adr/0007-backend-package-structure.md)).
- Errors are RFC 9457 `problem+json` through the shared advice
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)); no bespoke error
  bodies, and no internal exception text in `detail`.
- Bean Validation bounds every request parameter and body field, following the
  bounded-parameter convention `catalog`'s controller already applies.
- The caller comes from the validated token via `identity`
  ([iteration 4 task 3](../iteration-4.md)). A user id must never be accepted
  from the request — that is the whole isolation boundary, and it fails
  silently if got wrong.
- Catalog endpoints stay public; only these require authentication
  ([architecture.md §6](../../architecture.md)).
- The settled endpoint contract lands in
  [architecture.md §4](../../architecture.md) in this task's PR — it names the
  cellar's shape but deliberately leaves the URLs to this task.
- **Endpoints, settled in refinement:**
  - `GET /api/v1/cellar` — the caller's entries, each carrying a derived
    quantity, not its bottles.
  - `GET /api/v1/cellar/entries/{entryId}/bottles` — one entry's bottles. The
    one endpoint that nests under an entry, because it is the one genuinely
    entry-scoped collection read.
  - `POST /api/v1/cellar/bottles` — add a bottle; the body carries the catalog
    `beerId` and creates the entry implicitly if the beer is not already in
    the cellar.
  - `PATCH /api/v1/cellar/bottles/{id}` / `DELETE /api/v1/cellar/bottles/{id}`
    — update or remove a bottle, addressed by bottle id alone.
  - Bottle ids alone address a bottle (no `entryId` in that URL): an
    `entryId` in the path cannot be trusted any more than a caller-supplied
    user id, so ownership is verified by joining `bottle → entry → user_id`
    regardless of what the path claims — an untrusted `entryId` there would
    only add a second, redundant "path entry doesn't match the bottle's real
    entry" case for no isolation benefit.
- The cellar list (`GET /api/v1/cellar`) is not paginated — a cellar is
  realistically far smaller than the catalog.
- An entry or bottle id belonging to another user returns 404, applied
  uniformly across every item-scoped endpoint — never 403.
- A cellar entry whose catalog beer has left the catalog is out of scope:
  cross-schema foreign keys are already disallowed
  ([architecture.md §3](../../architecture.md)), so `ON DELETE RESTRICT` isn't
  implementable at the DB level, and nothing deletes catalog beers before
  [iteration 8](../iteration-8.md). Revisit once catalog gains deletion.
- `problem+json` responses carry `detail` text only in this task — no
  machine-readable `type`/`code`. Whether that becomes a convention for every
  module's advice is a separate decision, not this task's to make
  ([backlog](../backlog.md) — mobile client).
- Bottle ids are always server-assigned; `POST /api/v1/cellar/bottles` does
  not accept a client-supplied id
  ([task 01](01-cellar-module-and-schema.md)'s open call).

## Open questions

**None.**

## Acceptance criteria

- [x] `GET /api/v1/cellar` returns the caller's entries, each with its derived
      quantity and no bottle array — integration test, confirmed to fail
      against an implementation that embeds bottles in the list
- [x] `GET /api/v1/cellar/entries/{entryId}/bottles` returns that entry's
      bottles — integration test
- [x] `POST /api/v1/cellar/bottles` adds a bottle to a catalog beer; a second
      bottle of a beer already in the cellar extends the existing entry
      rather than creating a second one; an id sent in the request body is
      ignored and the created bottle always gets a server-assigned id —
      integration test
- [x] `PATCH /api/v1/cellar/bottles/{id}` updates a bottle's brewed date,
      best-before date and container type, and the change persists —
      integration test
- [x] `DELETE /api/v1/cellar/bottles/{id}` removes a bottle, and the entry's
      derived quantity reflects the removal afterward — integration test
- [x] **A request carrying user A's token gets 404 — never 403 — for user B's
      cellar entry or bottle**, for every item-scoped endpoint — integration
      test asserting the exact status code, confirmed to fail against an
      implementation that trusts a caller-supplied user id
- [x] An unauthenticated request to any cellar endpoint is rejected, while
      `/api/v1/beers` still answers anonymously — one test covering both, so
      locking down the cellar cannot silently lock down the catalog
- [x] Adding a beer that does not exist in the catalog is refused with a
      `problem+json` 400/404 rather than creating an orphan row — integration
      test
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [x] `mvn verify` green, module boundary tests unchanged

## Notes

The isolation criterion is the one worth writing the test for first — it is
the criterion the iteration's own "Done when" ends on ("another user cannot
see it").
