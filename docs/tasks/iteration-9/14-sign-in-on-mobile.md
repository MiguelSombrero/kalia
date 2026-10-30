# Task 14: A user signs in and out of the app

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-2

## Why

`DW-2` needs the app to sign in through Keycloak, show who is signed in, and
sign out, on both simulators. Native sign-in is where the web's guarantees stop
applying: there is no BFF to refresh tokens
([ADR-0029](../../adr/0029-silent-token-refresh.md)) and no back-channel logout
to end a session from outside
([ADR-0031](../../adr/0031-backchannel-logout.md)), so the app has to refresh
on its own and end its own session when a refresh fails.

## Scope

The app signs a user in through Keycloak in the system browser, keeps the
tokens in secure storage, refreshes them silently, shows the signed-in user,
signs out, and returns to signed-out when a refresh fails — on the iOS
Simulator and the Android emulator.

## Non-goals

- Sign-up inside the app, beyond whatever task 05 decides about reaching
  Keycloak's own sign-up page.
- Biometric unlock.

## Constraints

- [Task 05](05-decision-mobile-authentication.md)'s ADR and
  [task 13](13-keycloak-mobile-client.md)'s client.
- [Task 09](09-shared-packages.md)'s mobile mutator attaches the token.
- [Task 06](06-decision-mobile-testing-strategy.md)'s testing strategy.

**Decided at refinement, 2026-10-30** (product owner):

- **The app shows the profile's username,** read from the profile endpoint
  ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md));
  `/api/v1/me` was removed in iteration 8.5.
- **The app is usable signed out.** Sign-in is a choice on the Profile tab,
  not a gate on launch, as the catalog is anonymous on the web.
- **When a failed refresh signs the user out, they read** "You were signed
  out. Sign in again to continue." / "Sinut kirjattiin ulos. Kirjaudu
  uudelleen jatkaaksesi."
- **Sign-out, online or offline, is
  [task 05](05-decision-mobile-authentication.md)'s decision:** the device
  forgets the tokens at once, and revokes them at Keycloak when it can.
- **Expiry is exercised with a clock the test controls,** not a realm with
  short lifespans.
- **Sign-in is checked by hand on both simulators;** the iteration's
  automated end-to-end flow stays anonymous
  ([task 15](15-walking-skeleton-slice.md)).

## Open questions

**Answered, waiting on an accepted ADR.** Every question raised for this task
was answered at refinement on 2026-10-30 (Constraints). It stays
`needs-refinement` only because [the iteration](../iteration-9.md) has a
decision accepted before the build tasks it binds are refined — here those of
tasks [05](05-decision-mobile-authentication.md) and
[06](06-decision-mobile-testing-strategy.md). A second pass moves it once they
merge, or reopens a question an ADR contradicts.

## Acceptance criteria

- [ ] On both simulators, a user signs in, sees who they are, and signs out —
      described in the PR
- [ ] Unit tests cover the token store: a successful refresh, a failed refresh
      returning to signed-out, and sign-out clearing secure storage
- [ ] An expired access token is refreshed before the next API call without the
      user seeing it — covered by a test
- [ ] `make verify-fast` is green
