# Task 07: `identity` owns who the caller is, and services own who may read what

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**`profile` decodes the token itself.** `profile/web/ProfileController.java:70-84`
re-reads the JWT. `currentUserId` (`:72-74`) is a bare `UUID.fromString`, with
no guard like `identity/application/CurrentUserService.java:54-64`'s, so a
non-UUID `sub` is a bare `IllegalArgumentException` — a 500 with no
explanation. `currentUsername` (`:76-84`) is a copy of `CurrentUserService.java:40-46`
down to the exception message, so the two can drift. `docs/architecture.md`
says `identity` owns that mapping; `ArchitectureTest.java:128-135` guards only
`CurrentUserService`, and the exception is documented only in
`backend/README.md`. Root cause: `IdentityApi.java:15-17` exposes only the id,
and [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) keeps
`profile` a leaf. Iteration 9's `kalia-mobile` Keycloak client is where an
unexpected token shape would first arrive.

**The public-cellar visibility rule lives in the web layer.**
`PublicCellarController.java:58-60` resolves visibility and throws, while
`CellarService.readPublicCellar` (`:43-48`) is a body-identical alias of
`listEntries` (`:38-41`) that loads any user's cellar unchecked. `feed`
enforces the same rule in its application layer (`FeedService.java:134-137`).
Moving it conflicts with `backend/README.md`'s "a public read takes a resolved
owner id".

## Scope

Every controller learns who the caller is the same way, and a malformed token
is an explained 401 everywhere. A service that returns another user's data
checks whether it may, so no second controller or client can skip the check.

## Constraints

- [ADR-0028](../../adr/0028-resource-server-and-current-user.md): per-user data
  keys on the token's `sub`.
- [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) and
  [ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md): the module
  graph and the visibility rule. A new module edge is a §3 change
  `ArchitectureDocumentationTest` will check.
- `backend/README.md` "Endpoints are protected unless listed as public" is the
  convention; whichever way this goes, it is rewritten to match the code.

**Decided at refinement, 2026-10-24** (product owner):

- **`IdentityApi` exposes the caller's id and username**, and `profile` depends on `identity` as `cellar` does; the token-claims logic exists once. [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) is amended, and §3 and its documentation test follow.
- **The visibility rule moves into `CellarService`:** the public read takes the username and enforces visibility itself, as `feed` does, and `backend/README.md`'s "a public read takes a resolved owner id" convention is rewritten.

## Open questions

**None.**

## Acceptance criteria

- [x] A token whose `sub` is not a UUID gets the same explained 401 from
      `/api/v1/profile` as from the cellar — an integration test, confirmed to
      answer 500 today
- [x] `ProfileController` reads the caller through `IdentityApi`, the
      token-claims logic exists only in `identity`, and ArchUnit fails `Jwt`
      use outside it — proven against an `archfixture`
- [x] A `CellarService` integration test shows the public read refuses a
      private cellar with the same indistinguishable 404, whichever controller
      calls it
- [x] `backend/README.md` and §3 describe the result, and `make verify` is
      green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-40 and SHOULD-45.
Merged because both put a rule at the web edge that the application layer
should own, in modules a second client calls straight into.
