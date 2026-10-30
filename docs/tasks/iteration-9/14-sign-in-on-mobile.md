# Task 14: A user signs in and out of the app

- **Status:** refined
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

- [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md),
  [task 05](05-decision-mobile-authentication.md)'s decision, and
  [task 13](13-keycloak-mobile-client.md)'s client.
- [Task 09](09-shared-packages.md)'s shared core calls a transport the app
  registers; [task 11](11-app-skeleton.md) registers it, and this task adds
  the token source to it.
- [ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)'s
  testing conventions.
- An OAuth library and a secure-storage library are new dependencies, asked
  for when this task starts, as ADR-0095 says
  (`CLAUDE.md` "New dependencies").

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

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
was accepted:

- **Refreshes are single-flight.** Calls that need a token while a refresh is
  already running wait for it and share its result. If Keycloak rotates
  refresh tokens for this client
  ([task 13](13-keycloak-mobile-client.md) finds out), two refreshes at once
  would spend the token twice and sign the user out for nothing; if it does
  not, one refresh is still cheaper than two.
- **Whatever refresh token a refresh returns is stored before the new access
  token is used,** whether or not the server rotates.
- **The sign-in page opens in the app's language,** by sending `ui_locales`,
  as the web's sign-in actions do
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)).
- **A sign-in the user cancels returns quietly to signed-out.** One that
  fails shows "Sign-in didn't work. Try again." and the sign-in action again.
- **Sign-up is Keycloak's own page, reached from the sign-in page,** and
  the realm requires email verification
  ([task 13](13-keycloak-mobile-client.md)'s `baseUrl` gives the verified user
  a way back). It is checked by hand on a simulator together with sign-in.
- **The Profile tab's strings** reuse the web's `auth.signIn`, `auth.signOut`
  and `profile.signIn.*` where they exist; the rest are new and go into the
  shared strings package in both languages:

  | Where | English | Finnish |
  |---|---|---|
  | Signed in | Signed in as {{username}} | Kirjautuneena käyttäjänä {{username}} |
  | Sign-in failed | Sign-in didn't work. Try again. | Kirjautuminen ei onnistunut. Yritä uudelleen. |
  | Profile could not load | Couldn't load your profile. | Profiilin lataus ei onnistunut. |

  The profile error offers "Try again" / "Yritä uudelleen", as the web's do.
- **The username is not cached.** With no connection and an expired access
  token the user stays signed in and the Profile tab shows the error state;
  an offline cellar is [iteration 12](../iteration-12.md)'s.
- **Depends on [task 09](09-shared-packages.md),
  [task 11](11-app-skeleton.md) and [task 13](13-keycloak-mobile-client.md).**

## Open questions

**None.**

## Acceptance criteria

- [ ] On both simulators, a user signs in, sees who they are, and signs out —
      described in the PR
- [ ] Unit tests cover the token store: a successful refresh, a failed refresh
      returning to signed-out, and sign-out clearing secure storage
- [ ] An expired access token is refreshed before the next API call without the
      user seeing it — covered by a test
- [ ] A refresh that Keycloak answers with `invalid_grant` ends the session,
      clears secure storage and shows the signed-out message, while a refresh
      that fails for any other reason (no network, a 5xx) leaves the user signed
      in — covered by tests ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md))
- [ ] The refresh token a refresh returns is written to secure storage before
      the new access token is used, so a request that dies after the refresh
      does not leave the app holding a spent token — covered by a test
- [ ] Two calls that find the access token expired at the same moment cause
      one refresh, and both use its result — covered by a test
- [ ] The sign-in page opens in the app's language, a cancelled sign-in
      returns quietly to signed-out, and a failed one shows the message above
      — the first two checked by hand, the message covered by a test
- [ ] A new account registered from the app's sign-in page and verified from
      the emailed link ends with the user able to sign in — checked by hand on
      a simulator and described in the PR
- [ ] The Profile tab's strings read as the table above in both languages,
      and "Try again" calls the profile endpoint again — covered by a test
- [ ] Sign-out online forgets the tokens on the device and revokes them at
      Keycloak, after which the old refresh token is refused; offline, it
      forgets them and completes without a connection — the clearing covered by
      a test, the revocation checked against the local Keycloak and described in
      the PR
- [ ] `make verify-fast` is green
