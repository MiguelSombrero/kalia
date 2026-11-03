# Task 19: A slow Keycloak delays one call in the app, not every call

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

[Iteration 10 task 08](../iteration-10/08-the-app-survives-a-token-it-cannot-use.md)
made the app survive a refresh it cannot complete: after the 10-second timeout
in `mobile/src/lib/auth/keycloakClient.ts`, the transport sends the call
without a token, so an anonymous read such as the Catalog tab still works.
But a transient failure is not remembered. While Keycloak is slow rather than
down, every call starts a fresh refresh and waits out its own 10 seconds, so
the Catalog tab works with every request ten seconds late (SHOULD-97).

On a phone over a tailnet
([ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)),
a slow identity provider is an ordinary afternoon, not an outage.

## Scope

After a refresh fails for a transient reason, calls made within a short window
skip the attempt and go without a token at once; the first call after the
window tries again. A refresh that fails because the token is no longer valid
is handled as task 08 decided, unchanged.

## Non-goals

- Anything in the web, whose refresh runs in the BFF
  ([ADR-0029](../../adr/0029-silent-token-refresh.md)).

## Constraints

- Expo and React Native postdate model training — check docs.expo.dev at the
  SDK version in `mobile/package.json` for any API used, never memory.
- The offline token and the session it stands for are
  [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)'s;
  a skipped refresh must not discard them.
- Mobile unit tests run on Jest, and an end-to-end flow on Maestro with
  Android the only CI platform
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).

## Open questions

1. **The window's length,** and whether a signed-in screen tells the user the
   app is running signed out while it lasts.

## Acceptance criteria

- [ ] A Jest test with a refresh that times out shows the next call inside the
      window sent at once without a token, and a call after the window trying
      again; it failed before the change
- [ ] A Jest test shows a refused refresh still handled as task 08 decided
- [ ] `npm test` in `mobile/` and `make verify-fast` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-97, found reviewing
iteration 10 task 8. The one mobile task in an iteration otherwise about the
web: it is the only SHOULD left open.
