# Task 13: Make the caller-identity convention match the code

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

[`backend/README.md`](../../../backend/README.md)'s "Endpoints are protected
unless listed as public" bullet ends: "A service that needs the caller injects
`CurrentUserService` rather than taking a principal parameter." That
convention has **zero production instances**, and is impossible for any module
but `identity`:

- `CurrentUserService` lives in `identity.application`
  ([CurrentUserService.java](../../../backend/src/main/java/fi/kalia/identity/application/CurrentUserService.java)) —
  module-private, and `ArchitectureTest` forbids another module reaching below
  a module's root package.
- Every actual cross-module consumer does the opposite. `CellarController`
  resolves the id at the `web` edge via `IdentityApi.requireCurrentUserId()`
  and threads `UUID userId` through all five `CellarService` methods
  ([CellarService.java](../../../backend/src/main/java/fi/kalia/cellar/application/CellarService.java),
  [CellarController.java](../../../backend/src/main/java/fi/kalia/cellar/web/CellarController.java));
  `profile` does the same
  ([ProfileController.java:62](../../../backend/src/main/java/fi/kalia/profile/web/ProfileController.java)).
- [ADR-0028](../../adr/0028-resource-server-and-current-user.md) — the ADR the
  bullet cites — only says the `identity` module maps `sub` to
  `CurrentUser.id`. The injection convention is stated **nowhere but the
  README**.

The next task to touch this is
[iteration-6 task 02](../iteration-6/02-public-cellar-api.md), the public-cellar
read (`readPublicCellar(UUID ownerId)`,
[CellarService.java:32](../../../backend/src/main/java/fi/kalia/cellar/application/CellarService.java)),
which serves an **anonymous** caller — the one case where "inject
`CurrentUserService`" is not merely unused but actively wrong, because there is
no current user. A written rule that produces wrong code for the very next
change is the project's "documentation and implementation never drift apart"
goal failing where it is still cheap to fix.

## Scope

[`backend/README.md`](../../../backend/README.md), and any other document that
repeats the claim, describe the identity-resolution pattern the code actually
uses; a mechanism pins it so it cannot silently drift again.

## Non-goals

- Changing any production code's identity handling — the code is the correct
  side of this contradiction (see Constraints).
- Re-opening [ADR-0028](../../adr/0028-resource-server-and-current-user.md)'s
  "`sub` is the user id" decision.
- The `IdentityApi` surface, which already exposes `requireCurrentUserId()`.

## Constraints

- **Decided with the product owner (2026-09-04, quality backlog MUST-3):
  rewrite the convention to match the code.** The controller resolves the
  caller via `IdentityApi` at the `web` edge and passes the id into the
  `application` service; a public or anonymous read passes a resolved owner id
  or none.
- `CurrentUserService` stays `identity`-module-private and `IdentityApi` stays
  the only cross-module identity surface
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md),
  `ArchitectureTest`).
- [ADR-0020](../../adr/0020-documentation-roles.md): the convention has one
  home. Refinement decides whether that is `backend/README.md` alone with a
  one-line pointer from ADR-0028, or a small ADR-0028 amendment.
- An accepted ADR is amended, never rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

## Open questions

- **Module boundaries:** does
  [ADR-0028](../../adr/0028-resource-server-and-current-user.md) get an
  amendment, or does only the README bullet change? Its revisit-trigger list
  is about the authentication mechanism, not this convention.
- **Completion signal / enforcement:** can an ArchUnit rule pin it — e.g. no
  class outside `identity` depends on `CurrentUserService` — or does
  `backend/README.md`'s "don't add a fixture for an already-satisfied rule"
  caveat argue against it? If no test, a written rationale.
- **Terminology:** is "principal parameter" versus "the caller's id" worth
  standardising across the README and `docs/architecture.md` §4's
  authentication bullet?
- **Scope:** does the `CurrentUserService` mention in the
  [ProfileController comment](../../../backend/src/main/java/fi/kalia/profile/web/ProfileController.java)
  need rewording too?

## Acceptance criteria

- [ ] [`backend/README.md`](../../../backend/README.md) no longer tells a
      service to inject `CurrentUserService`; it describes edge resolution via
      `IdentityApi` with the id passed to the service, and a reader following
      it writes code matching `CellarController` / `CellarService`
- [ ] An automated check fails when a module outside `identity` depends on
      `CurrentUserService` — an ArchUnit rule in `ArchitectureTest` confirmed
      to fail against a deliberately-added violation — **or** the PR records
      why no test is added
- [ ] `docs/architecture.md` §4's authentication bullet and
      [ADR-0028](../../adr/0028-resource-server-and-current-user.md) are
      consistent with the new wording; `node scripts/check-adrs.mjs` and
      `make verify` are green
- [ ] If ADR-0028 is amended, `docs/adr/README.md`'s gloss still matches

## Notes

Provenance: quality backlog **MUST-3** (confirmed 2026-08-30). The
`[needs decision]` was resolved with the product owner on 2026-09-04 — rewrite
the convention, not the code. Directly de-risks
[iteration-6 task 02](../iteration-6/02-public-cellar-api.md).
