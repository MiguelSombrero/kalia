# Task 08: The app survives a token it cannot refresh or the server refuses

- **Status:** done
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Two token-handling gaps were deferred from iteration 9's sign-in task, and a
real phone on a real network makes both ordinary:

- The app's transport asks the token store for a token on every API call,
  anonymous ones included. While a signed-in user's refresh fails for a
  transient reason — Keycloak slow or down, the backend up — the catalog and
  the launch check fail with it, though neither needs a token (SHOULD-95). On
  a phone that reaches the Mac over a tailnet or Wi-Fi, a slow Keycloak is a
  normal afternoon.
- The app trusts its own clock for an access token's expiry and never reacts
  to a `401` from the API. A token the server stopped accepting inside its
  five minutes — a disabled account, a revoked session, a skewed device clock
  — leaves the Profile tab on "Couldn't load your profile." until the local
  expiry passes (COULD-102). A phone's clock is not the simulator's, which is
  the Mac's.

## Scope

A call an anonymous caller may make succeeds while a signed-in user's refresh
is failing, and a `401` from the API makes the app refresh once and retry the
call before it shows an error or signs the user out.

## Non-goals

- Offline behaviour — [iteration 12](../iteration-12.md).
- Changing token lifetimes or rotation, decided by
  [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md).

## Constraints

- ADR-0095: a public PKCE client holding an offline token; a failed refresh
  that Keycloak refuses (not one that times out) ends the session.
- The transport is the shared API client's
  ([ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)),
  and the web uses it too — a change to the shared mutator must keep the web's
  behaviour.
- One refresh at a time: two calls getting `401` together must not start two
  refreshes of one offline token.

**Decided at refinement, 2026-11-01** (product owner):

- **A transient token failure degrades the call to anonymous.** When the token
  store's refresh fails transiently, the transport sends the call without a
  token: an anonymous operation (the catalog, the launch check) succeeds, and
  one that needs a user gets its `401` and is handled below. No list of
  anonymous operations is kept in the client.
- **Transient means a network error, a timeout, a 5xx or a 429** from
  Keycloak. Keycloak refusing the refresh (a 4xx such as `invalid_grant`)
  ends the session, as ADR-0095 already states.
- **A `401` forces one refresh, shared by every call waiting on it, and one
  retry.** A second `401` shows the error and keeps the user signed in —
  signing out would not repair a configuration or clock fault.
- **The user sees nothing new** while a refresh fails transiently; offline
  states are [iteration 12](../iteration-12.md)'s.

## Open questions

**None.**

## Acceptance criteria

- [x] A Jest test shows the catalog list and the launch check succeeding while
      the token store's refresh rejects with a network error, and it failed
      before the fix
- [x] A Jest test shows a `401` triggering exactly one refresh and one retry,
      including for two concurrent calls
- [x] The web's unit tests of the shared transport still pass unchanged, or
      their change is explained in the PR
- [x] On the iPhone or a simulator, stopping Keycloak while signed in leaves
      the Catalog tab working — verified by hand and described in the PR
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-95 and COULD-102,
both deferred in the iteration 9 task 14 pull request.
