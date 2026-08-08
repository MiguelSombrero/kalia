# Task 01: User profile and cellar visibility

- **Status:** needs-refinement
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

A profile owned by the backend: whatever identifies a user to other users, plus
the setting that says whether their cellar is public. Created for a user the
first time it is needed, so nobody has to fill in a form before they can use
the app. Visibility defaults to private.

## Non-goals

- Reading a public cellar — [task 02](02-public-cellar-api.md).
- Any UI — tasks [03](03-profile-page.md) and [04](04-public-cellar-page.md).
- Editing anything Keycloak owns. Kalia does not become a place to change your
  password or email.
- Per-beer or per-bottle visibility. A cellar is public or it is not.

## Constraints

- Module layout and dependency direction follow
  [ADR-0007](../../adr/0007-backend-package-structure.md).
- The Keycloak `sub` stays the canonical per-user key
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)); a profile
  is keyed by it, never by anything a request supplies.
- **Private is the default and must survive a missing profile.** Code that
  reads visibility has to treat "no profile row" as private. This fails
  silently in exactly the wrong direction.
- One schema per module, migrations under the module's own Flyway location
  ([backend/README.md](../../../backend/README.md)).

## Open questions

1. **Does the profile live in `identity`, or in a new `profile` module?**
   `identity` today is strictly about tokens and the current user, and a
   profile is user-facing data other users read — arguably a different
   subdomain. A new module is the more honest boundary and one more module to
   carry.
2. **What identifies a user to other users?** A display name, a handle in the
   URL, both, or the Keycloak username? This decides what a public cellar's URL
   looks like and whether it is guessable, and it is hard to change afterwards.
3. **Where does that name come from?** Keycloak already holds a username and
   possibly a name; copying it at first sign-in is easy and immediately stale,
   reading it live couples every profile read to Keycloak, and asking the user
   means a form before they can do anything.
4. **Is the profile created on first sign-in, or lazily on first use?** First
   sign-in needs a hook in the auth flow; lazily means every reader must handle
   absence — which the constraint above requires anyway.
5. **What else belongs on a profile now?** Nothing else is needed by this
   iteration. Anything added here without a consumer is the mistake
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) was amended
   about.
6. **Can the identifier from question 2 change after it has been used?** A
   public cellar's URL is the thing people paste to each other, so an
   identifier that moves when a user renames themselves breaks every link
   already shared. That is recoverable on the web — a redirect fixes it — and
   less so anywhere the URL has been claimed by something that cannot be
   redeployed to learn the new rule ([backlog](../backlog.md) — mobile client).
   Either the identifier is immutable, or renaming leaves the old one
   resolving, or shared links are accepted as breakable; the third is a
   legitimate answer, just not one to arrive at by accident.

## Acceptance criteria

- [ ] A signed-in user has a profile without ever having filled in a form, and
      it is the same profile across sessions — integration test signing in
      twice
- [ ] A profile's cellar visibility defaults to private, and a user with no
      profile row at all reads as private rather than throwing or defaulting
      open — unit test for the second case, confirmed to fail against an
      implementation that assumes the row exists
- [ ] A user can change their own visibility and cannot change anyone else's —
      integration test covering both, the second confirmed to fail against an
      implementation trusting a caller-supplied id
- [ ] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest` pass
- [ ] `docs/architecture.md` gains the profile's shape and the visibility rule
      in this task's PR

## Notes

The visibility flag is stored here but enforced in
[task 02](02-public-cellar-api.md), which is where it can actually be proven.
Storing it and enforcing it in different tasks is deliberate; it is also the
seam where this could go wrong, so task 02's isolation tests are the ones that
matter.
