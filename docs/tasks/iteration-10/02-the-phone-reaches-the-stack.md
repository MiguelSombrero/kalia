# Task 02: The phone signs in and browses against the stack on the Mac

- **Status:** refined
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

- Follows [ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)
  ([task 01](01-decision-how-a-phone-reaches-the-mac.md)'s decision), now
  accepted: one origin per mode, no request-derived hostname, no second issuer.
- The tailnet's name and the Mac's are host details: the root `.env` only,
  never a commit, a pull request, a comment or a committed generated file.
- Tailscale is a new dependency: its version is proposed at implementation,
  confirmed from the registry or release output, and agreed by the product
  owner in the pull request before it merges
  ([iteration 10](../iteration-10.md#refinement)).
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
- **When the origin is unreachable** the app keeps today's generic error, and a
  development build also logs the origin it tried.

**Decided in the second pass, after ADR-0097 was accepted** (product owner
directing; ADR-0097 leaves the switch and the variable's name to this task):

- **One variable is both the switch and the value:** phone mode is on exactly
  when `KALIA_PHONE_HOST`, the tailnet host name, is non-empty in the root
  `.env`. There is no separate boolean, so the mode and the value cannot
  disagree, and a worktree's root `.env` decides for that worktree.
- **Two `make` targets switch it.** `make phone-mode HOST=<tailnet-name>` sets
  the variable, recreates the services that carry it, and replaces the
  machine's `tailscale serve` forwards with this worktree's ports;
  `make phone-mode-off` clears it, recreates them, and removes the forwards. The
  replacement is where another worktree's forwards go, as the ADR requires.
- **`make mobile-doctor` gains a `phone` check** (`ARGS="phone"`, and part of the
  default run only when phone mode is on): Tailscale not running, and a
  phone-mode origin that does not answer, each named. Phone mode being off is
  not a failure of the default run; `ARGS="phone"` says it is off.
- **Metro is forwarded with the stack's three ports.** A development build on
  the iPhone, which [task 04](04-free-apple-id-signing.md) installs first,
  loads its JavaScript from Metro, whose `METRO_PORT` the ADR does not
  forward and `scripts/mobile-env.mjs` advertises as `localhost`. In phone mode
  `make phone-mode` forwards `METRO_PORT` too and `mobile-env` advertises the
  tailnet host (`REACT_NATIVE_PACKAGER_HOSTNAME`); Metro is then on the tailnet
  only while `make mobile-start` runs. ADR-0097 is amended in this task's PR:
  four ports not three, the exposure paragraph, and which address Metro
  listens on (the Expo CLI at the SDK in `mobile/package.json` decides it).
- **What each client does in each mode is the ADR's table.** Where a client
  cannot work, the target refuses rather than failing as a broken sign-in:
  `make mobile-android` and `make mobile-e2e` stop with phone mode on, naming
  `make phone-mode-off`. The web app's Playwright end-to-end suite is the
  ADR's "not run" and is not guarded. The iOS Simulator in phone mode needs a
  build made for it, from `mobile-env`'s phone-mode origins.
- **Which build the iPhone criterion uses:** the development build, with Metro
  forwarded. The release build's sign-in on the iPhone, and its cleartext
  exception, are [task 05](05-build-variants.md)'s.
- **The ADR's five unverified points are all this task's,** and each is shown
  below or the ADR is amended; none is deferred.

## Open questions

**None.**

## Acceptance criteria

- [ ] On the iPhone, with the development build loading its JavaScript from
      Metro on the tailnet, a user signs in through the Mac's Keycloak, sees
      the Catalog tab list real beers, and signs out — verified by hand and
      described in the PR, with no host address or name in the description.
      This also shows Keycloak's `sslRequired` of `none` answering a sign-in
      over HTTP on a name that is not `localhost`, and the development build
      reaching the tailnet host over HTTP
- [ ] With phone mode off, the web app signs in on `localhost`, the iOS
      Simulator signs in and lists the catalog by hand (described in the PR),
      and the Android flow passes through `make mobile-e2e`
- [ ] With phone mode on, the web app signs in from the Mac's browser on the
      tailnet origin, and the iOS Simulator, on a build made for phone mode,
      signs in and lists the catalog — by hand, described in the PR
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
- [ ] The realm follows the one origin: a unit test of the drift check
      (`scripts/check-keycloak-realm-config.mjs`) shows it failing a
      phone-mode realm whose `kalia-web` redirect URIs or web origins, or
      either client's root or base URL, do not name that origin, and one in
      which `kalia-mobile`'s redirect URIs are anything but the single exact
      `kalia://auth/callback`
- [ ] A unit test of `scripts/mobile-env.mjs` shows the app's API and Keycloak
      origins and Metro's advertised host built from the one value and the
      stack's own ports in phone mode, `localhost` with them in the default,
      and the one value coming from the root `.env` and no committed file
- [ ] A test in `SecurityConfigTest` shows the backend, configured for one
      issuer, refusing a token whose issuer differs from it only by host (the
      other mode's), in both directions (ADR-0028)
- [ ] With phone mode on, Keycloak's discovery document fetched on the tailnet
      origin names, as its issuer, the value the backend and the web validate —
      run by hand with the stack in phone mode and described in the PR, with no
      host name in the description
- [ ] The remaining ADR points are each shown true on the running stack, or the
      ADR is amended in the PR: `tailscale serve` forwarding plain HTTP for each
      forwarded port, under the same number, to `127.0.0.1`; the Mac reaching
      its own tailnet name, from its browser and from the iOS Simulator; two
      worktrees, one in phone mode and one not, running beside each other with
      `make phone-mode` replacing the forwards rather than colliding with them
- [ ] ADR-0097 is amended for the fourth forwarded port, Metro's, and the
      address it listens on, and passes `node scripts/check-adrs.mjs`
- [ ] With phone mode on, `make mobile-android` and `make mobile-e2e` stop
      naming `make phone-mode-off`; `make mobile-doctor ARGS="phone"` reports
      Tailscale not running, phone mode off, and a phone-mode origin that
      does not answer — each covered by a unit test
- [ ] A Jest test shows a development build logging the origin a request that
      got no response tried, and a release build logging none — origin only,
      no path, query string or token (ADR-0013)
- [ ] The docs the change touches say what is true: `mobile/README.md` says how
      to point the app at the Mac from a phone, and
      [architecture.md](../../architecture.md)'s statements of the issuer and the
      app's origins name phone mode
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks.

Order: this runs before [task 21](21-an-error-on-a-phone-leaves-something-to-read.md),
which also changes what the shared transport does when a request fails; the
origin log here is the smaller change and 21 builds on it.
