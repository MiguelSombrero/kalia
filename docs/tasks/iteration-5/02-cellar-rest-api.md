# Task 02: Cellar REST API, scoped to the signed-in user

- **Status:** needs-refinement
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

## Open questions

1. **What is the URL shape for a bottle?** Nested under its entry
   (`/api/v1/cellar/entries/{entryId}/bottles/{id}`) makes the containment
   explicit and the isolation check obvious; flat (`/api/v1/cellar/bottles/{id}`)
   is shorter and needs no entry id the client may not have. The choice is
   permanent in a way the response body is not.
2. **Does listing the cellar include each entry's bottles, or only a count?**
   Embedding them is one request for the page task 03 builds; a count plus a
   second call keeps the list response small. This decides whether the cellar
   page can render without a second round trip.
3. **What happens to a cellar entry whose beer leaves the catalog?** The
   catalog is seeded today and nothing deletes from it — but once
   [iteration 8](../iteration-8.md) lets users add beers, something eventually
   will. The answer decides whether the foreign key is `ON DELETE RESTRICT` (a
   beer cannot be removed while someone owns it) or the API tolerates a
   dangling reference.
4. **Is the cellar list paginated?** The catalog endpoint is. A cellar is
   realistically far smaller, so the simpler answer is no — but that is a
   contract worth choosing deliberately rather than by omission, since adding
   pagination later changes the response shape.
5. **Does another user's entry or bottle id return 404 or 403?** 404 leaks
   nothing about what exists; 403 is more honest to a legitimate caller. The
   isolation test asserts whichever is chosen.

## Acceptance criteria

- [ ] Every endpoint behaves as the settled contract says — covered by `*IT`
      integration tests against a real database
- [ ] **A request carrying user A's token cannot read, update or delete user
      B's cellar entry or bottle** — an integration test asserts this for each
      item-scoped endpoint, and each was confirmed to fail against an
      implementation that trusts a caller-supplied user id
- [ ] Adding a second bottle of a beer already in the cellar extends the
      existing entry rather than creating a second one — integration test
- [ ] An unauthenticated request to any cellar endpoint is rejected, while
      `/api/v1/beers` still answers anonymously — one test covering both, so
      locking down the cellar cannot silently lock down the catalog
- [ ] Adding a beer that does not exist in the catalog is refused with a
      `problem+json` 400/404 rather than creating an orphan row — integration
      test
- [ ] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [ ] `mvn verify` green, module boundary tests unchanged

## Notes

The isolation criterion is the one worth writing the test for first — it is
the criterion the iteration's own "Done when" ends on ("another user cannot
see it").
