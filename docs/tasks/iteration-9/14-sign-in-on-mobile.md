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

## Open questions

1. **What does "shows the signed-in user" show?** The username from
   `/api/v1/me`, the profile's display name
   ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md)), or both.
2. **Is the app usable signed out?** The catalog is anonymous on the web; if
   the app is too, sign-in is a choice on the Profile tab rather than a gate on
   launch.
3. **What does the user read when a refresh fails** and they are signed out
   without asking — in en and fi?
4. **Sign-out while offline** — forget the tokens locally and tell the user, or
   refuse until there is a connection?
5. **How is expiry exercised** — a realm with short lifespans for the test, or
   a clock the test controls?

## Acceptance criteria

- [ ] On both simulators, a user signs in, sees who they are, and signs out —
      described in the PR
- [ ] Unit tests cover the token store: a successful refresh, a failed refresh
      returning to signed-out, and sign-out clearing secure storage
- [ ] An expired access token is refreshed before the next API call without the
      user seeing it — covered by a test
- [ ] `make verify-fast` is green
