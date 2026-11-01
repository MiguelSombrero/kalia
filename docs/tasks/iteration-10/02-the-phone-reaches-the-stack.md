# Task 02: The phone signs in and browses against the stack on the Mac

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** DW-2

## Why

[Task 01](01-decision-how-a-phone-reaches-the-mac.md) decides how a physical
phone reaches the Mac. Until the stack is configured to match, an app
installed on the iPhone ([task 04](04-free-apple-id-signing.md)) opens to a
catalog that fails to load and a sign-in that cannot complete.

## Scope

On the product owner's iPhone, Kalia signs in through the Keycloak running on
the Mac and lists the catalog served from it, while the browser and both
simulators keep working against the same stack as they do today. That means
the stack's configuration, Keycloak's hostname and the mobile client's
redirect URIs, and the app's API and Keycloak origins chosen per build
variant rather than edited by hand.

## Non-goals

- The variants themselves — [task 05](05-build-variants.md) owns development
  and release builds; this task gives each its origins.
- The app's behaviour on a flaky network — [task 08](08-the-app-survives-a-token-it-cannot-use.md).

## Constraints

- Follows [task 01](01-decision-how-a-phone-reaches-the-mac.md)'s ADR, which
  must be accepted before this task is refined.
- The app reads its origins from `EXPO_PUBLIC_API_ORIGIN` and
  `EXPO_PUBLIC_KEYCLOAK_ORIGIN` (`mobile/src/lib/config/origins.ts`), which
  Metro inlines only where `process.env.NAME` is written out in full —
  a computed lookup builds and silently ships `undefined`.
- Realm configuration is keycloak-config-cli's, under a drift check
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)); a
  redirect URI is added there, exactly, never as a wildcard
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- Never hard-code a port; worktree stacks run on their own (`make stack-env`).
- A dev default goes in `docker-compose.dev.env`
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
- The Maestro flow on Android CI
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md))
  must stay green on `localhost`.

## Open questions

1. **What the phone is checked with.** A manual run on the iPhone described in
   the PR is the only way to see DW-2; which automated checks stand beside it
   (an issuer-consistency check in `scripts/check-compose.mjs`, a unit test of
   the origin selection) is settled once task 01's answer is known.
2. **How the developer switches the stack into phone mode,** if task 01 makes
   it opt-in, and what `make mobile-doctor` reports when the phone cannot
   reach it.
3. **Failure messages:** what the app shows when the origin it was built with
   is unreachable — today's generic error, or one that names the cause for a
   developer build only.

## Acceptance criteria

- [ ] On the iPhone, a user signs in through the Mac's Keycloak, sees the
      Catalog tab list real beers, and signs out — verified by hand and
      described in the PR, with no host address or name in the description
- [ ] After the change, the web app signs in on `localhost` and the iOS
      Simulator and Android emulator flows still pass, the Android one through
      `make mobile-e2e`
- [ ] Each automated test task 01's ADR names — at least the issuer Keycloak
      stamps matching the one the backend and web validate — exists and was
      seen to fail against a mismatched configuration
- [ ] `mobile/README.md` says how to point the app at the Mac from a phone
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks.
