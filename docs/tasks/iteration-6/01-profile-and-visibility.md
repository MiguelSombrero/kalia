# Task 01: User profile and cellar visibility

- **Status:** done
- **Iteration:** [6](../iteration-6.md)

## Why

Kalia knows a signed-in caller only as a Keycloak `sub`
([ADR-0028](../../adr/0028-resource-server-and-current-user.md)) — an opaque
identifier with nothing attached. That was enough while the only per-user data
was a cellar only its owner could see.

It stops being enough the moment a cellar can be public, because a public
cellar has to belong to someone a stranger can name, and the choice to make it
public has to be stored somewhere. Both need a profile, which the app does not
have.

## Scope

A new `profile` module owning what identifies a user to other users, plus the
setting that says whether their cellar is public. Created for a user the first
time it is needed, so nobody has to fill in a form before they can use the app.
Visibility defaults to private.

## Non-goals

- Reading a public cellar — [task 02](02-public-cellar-api.md).
- Any UI — tasks [03](03-profile-page.md) and [04](04-public-cellar-page.md).
- Editing anything Keycloak owns. Kalia does not become a place to change your
  password or email.
- Per-beer or per-bottle visibility. A cellar is public or it is not.

## Constraints

- **[ADR-0049](../../adr/0049-profile-module-and-public-identity.md) decides
  what this task builds** — a `profile` module, keyed by the Keycloak `sub`,
  created lazily, carrying the token's `preferred_username` copied once and
  immutable thereafter plus a visibility flag defaulting to private, and
  nothing else. Its Alternatives section holds the reasoning; do not restate
  it here or relitigate it in review.
- `profile` is a leaf: it depends on no other module.
  [Task 02](02-public-cellar-api.md) reads it through `ProfileApi`, which is
  where that surface gets its first caller and therefore its shape
  ([architecture.md §3](../../architecture.md) — the module root package stays
  empty until a consumer arrives).
- Module layout and dependency direction follow
  [ADR-0007](../../adr/0007-backend-package-structure.md).
- The Keycloak `sub` stays the canonical per-user key
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)); a profile
  is keyed by it, never by anything a request supplies.
- **Private is the default and must survive a missing profile.** Code that
  reads visibility has to treat "no profile row" as private. This fails
  silently in exactly the wrong direction.
- **The username is copied at creation and never written again.** Nothing in
  Kalia updates it — not a later sign-in carrying a changed
  `preferred_username`, not an admin path. An implementation that refreshes it
  on read or on sign-in breaks every shared link without erroring
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md) is built on its
  immutability).
- One schema per module, migrations under the module's own Flyway location
  ([backend/README.md](../../../backend/README.md)).

## Open questions

**None.**

## Acceptance criteria

- [x] A signed-in user has a profile without ever having filled in a form, and
      it is the same profile across sessions — integration test signing in
      twice
- [x] A profile's username does not change when the same subject presents a
      token carrying a different `preferred_username` — integration test,
      confirmed to fail against an implementation that refreshes it
- [x] `profile` verifies as a Modulith module depending on no other module —
      `ModularityTest`
- [x] A profile's cellar visibility defaults to private, and a user with no
      profile row at all reads as private rather than throwing or defaulting
      open — unit test for the second case, confirmed to fail against an
      implementation that assumes the row exists
- [x] A user can change their own visibility and cannot change anyone else's —
      integration test covering both, the second confirmed to fail against an
      implementation trusting a caller-supplied id
- [x] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest` pass
- [x] `docs/architecture.md` gains the `profile` module row, the profile's
      shape and the visibility rule in this task's PR

## Notes

The visibility flag is stored here but enforced in
[task 02](02-public-cellar-api.md), which is where it can actually be proven.
Storing it and enforcing it in different tasks is deliberate; it is also the
seam where this could go wrong, so task 02's isolation tests are the ones that
matter.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). The
identifier decision was taken here rather than in
[iteration 6.5 task 05](../iteration-6.5/05-self-registration-with-email-verification.md),
which asks the same question from the sign-up side — the caveat
[iteration 6.5's index](../iteration-6.5.md) records.
