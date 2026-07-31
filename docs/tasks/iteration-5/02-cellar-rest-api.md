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

The four authenticated endpoints already specified in
[architecture.md §4](../../architecture.md): list the current user's cellar,
add a beer from the catalog, update quantity/details, remove an item. Every
one resolves the caller through `identity` and operates only on that user's
rows.

## Non-goals

- UI — [task 03](03-cellar-frontend.md).
- Sharing, public cellars, or any cross-user read. Not planned; if it is ever
  wanted it is a new decision, not an extension of this task.

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

## Open questions

1. **What happens to a cellar entry whose beer leaves the catalog?** The
   catalog is seeded today and nothing deletes from it, so this is currently
   theoretical — but the answer decides whether the foreign key is
   `ON DELETE RESTRICT` (a beer cannot be removed while someone owns it) or
   the API tolerates a dangling reference.
2. **Is the cellar list paginated?** The catalog endpoint is. A cellar is
   realistically far smaller, so the simpler answer is no — but that is a
   contract worth choosing deliberately rather than by omission, since adding
   pagination later changes the response shape.
3. **Does another user's item id return 404 or 403?** 404 leaks nothing about
   what exists; 403 is more honest to a legitimate caller. Task 01/02's
   isolation test asserts whichever is chosen.

## Acceptance criteria

- [ ] All four endpoints behave per `architecture.md` §4 — covered by `*IT`
      integration tests against a real database
- [ ] **A request carrying user A's token cannot read, update or delete user
      B's cellar item** — an integration test asserts this for each of the
      three item-scoped endpoints, and each was confirmed to fail against an
      implementation that trusts a caller-supplied user id
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
