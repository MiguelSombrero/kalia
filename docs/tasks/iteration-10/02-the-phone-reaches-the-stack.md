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

**Decided at refinement, 2026-11-01** (product owner):

- The route, the issuer and phone mode are [task 01](01-decision-how-a-phone-reaches-the-mac.md)'s
  decisions; this task builds them.
- **Checks beside the manual run:** `scripts/check-compose.mjs` fails a
  phone-mode configuration whose issuer Keycloak stamps differs from the one
  the backend or the web validates, and a unit test covers how
  `scripts/mobile-env.mjs` chooses the app's origins in each mode.
- **Switching:** a `make` target or `.env` switch, as task 01's ADR shapes it;
  `make mobile-doctor` reports Tailscale not running, phone mode off, and a
  phone-mode origin that does not answer.
- **When the origin is unreachable** the app keeps today's generic error, and a
  development build also logs the origin it tried.

## Open questions

1. **Task 01's ADR accepted?** Every answer this task needs is recorded above;
   it moves to `refined` in a short second pass once that ADR is accepted, as
   iteration 9's build tasks did.

## Acceptance criteria

- [ ] On the iPhone, a user signs in through the Mac's Keycloak, sees the
      Catalog tab list real beers, and signs out — verified by hand and
      described in the PR, with no host address or name in the description
- [ ] After the change, with phone mode off, the web app signs in on
      `localhost` and the iOS Simulator and Android emulator flows still pass,
      the Android one through `make mobile-e2e`
- [ ] With phone mode on, the web app signs in from the Mac's browser on the
      tailnet origin
- [ ] The issuer Keycloak stamps matches the one the backend and the web
      validate, in phone mode and with it off: `scripts/check-compose.mjs`
      fails a rendered configuration in which they differ, and was seen to
      fail against a mismatched one
      ([ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md))
- [ ] With phone mode off, the rendered default stack is unchanged: every
      address that names the stack is `localhost` with the stack's own port,
      and the edge's three ports are published on `127.0.0.1` only — checked by
      the same script, which also fails a phone-mode configuration that
      publishes a port beyond loopback
- [ ] The realm follows the one origin: the drift check
      (`scripts/check-keycloak-realm-config.mjs`) fails a phone-mode realm
      whose `kalia-web` redirect URIs or web origins, or either client's root
      or base URL, do not name that origin, and one in which `kalia-mobile`'s
      redirect URIs are anything but the single exact
      `kalia://auth/callback`
- [ ] A unit test of `scripts/mobile-env.mjs` shows the app's API and Keycloak
      origins built from the one value and the stack's own ports in phone
      mode, `localhost` with them in the default, and the one value coming from
      the root `.env` and no committed file
- [ ] The backend refuses a token stamped with the other mode's issuer — an
      existing resource-server test, or a new one beside it, with the backend
      configured for one issuer only (ADR-0028)
- [ ] With phone mode on, Keycloak's discovery document fetched on the tailnet
      origin names, as its issuer, the value the backend and the web validate —
      run by hand with the stack in phone mode and described in the PR, with no
      host name in the description
- [ ] The ADR's unverified points are each shown true on the running stack or
      the ADR is amended: `tailscale serve` forwarding plain HTTP for the three
      ports to the edge on `127.0.0.1`; the Mac reaching its own tailnet name,
      from its browser and from the iOS Simulator in phone mode; the
      development build reaching the tailnet host over HTTP
- [ ] `mobile/README.md` says how to point the app at the Mac from a phone
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks.
