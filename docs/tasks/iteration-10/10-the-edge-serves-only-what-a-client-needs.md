# Task 10: The edge serves only what a client needs

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Until now the stack has been reachable only from the Mac's loopback, so what
the edge forwards has been read by one person. [Task 01](01-decision-how-a-phone-reaches-the-mac.md)
is about to put it in front of a phone over a network, and three things the
edge forwards were never meant for a client:

- **Metrics.** Any self-registered user can read `/actuator/prometheus` on the
  deployable stack: `docker-compose.base.yml` enables it outside the dev
  overlay, though [ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)
  says "local development only", `SecurityConfig` requires only
  `authenticated()`, and the edge forwards every backend path. The web app
  guards its own counters with `METRICS_TOKEN` (SHOULD-68).
- **Keycloak's master realm.** Its admin console and token endpoint are served
  on the public edge (`edge/nginx.conf` forwards everything on Keycloak's
  port), no `KC_HOSTNAME_ADMIN` is set, and brute-force detection is
  configured only for the `kalia` realm, so the admin password is bounded only
  by the edge's per-address rate (SHOULD-69).
- **Back-channel logout.** `/api/auth/backchannel-logout` is published on the
  edge, though its only caller, Keycloak, posts to `web:3000` over the compose
  network (COULD-74).

## Scope

From outside the compose network, the edge serves the API, the web app and
the `kalia` realm's user-facing endpoints, and nothing else: metrics, the
master realm and the back-channel logout endpoint are unreachable through it,
while the host scripts and Keycloak itself keep the routes they need.

## Non-goals

- The edge's rate limits: COULD-75 stays in the backlog.
- Hosting: parked for cost.

## Constraints

- [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md):
  the edge is the one way in, and its configuration is checked.
- ADR-0088: metrics are counted without a viewer, and the web's
  `METRICS_TOKEN` is the precedent for guarding them.
- `scripts/keycloak-admin.mjs`, `make app-config`, `make moderate` and the
  seed scripts use the admin API from the host; whatever replaces the public
  route must keep them working.
- Realm configuration is keycloak-config-cli's under a drift check
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)).

**Decided at refinement, 2026-11-01** (product owner):

- **The edge's public ports answer `404`** for `/actuator/*` except
  `/actuator/health`, for `/admin` and `/realms/master`, and for
  `/api/auth/backchannel-logout` — in every stack, so the local and the
  deployable stacks cannot differ on it.
- **Metrics stay inside the compose network:** nothing outside it reads them,
  as ADR-0088's "counted without a viewer" already intends.
- **The admin console and the host scripts move to a separate admin port,**
  published on `127.0.0.1` by the dev overlay only, with `KC_HOSTNAME_ADMIN`
  naming it. Phone mode never forwards it
  ([task 01](01-decision-how-a-phone-reaches-the-mac.md)), and the deployable
  stack publishes no admin port at all.
- **Order with task 01:** not a prerequisite of phone mode, whose tailnet holds
  only the owner's devices; it runs first in the iteration's order anyway.

## Open questions

**None.**

## Acceptance criteria

- [ ] Through the edge's public ports, `/actuator/prometheus`, `/admin`,
      `/realms/master` and `/api/auth/backchannel-logout` answer `404` while
      `/actuator/health` still answers, checked by an automated test of the
      edge configuration
- [ ] The admin console opens on the loopback admin port of the local stack,
      and the deployable definition publishes no such port
- [ ] Sign-out on the web still ends the session through the back-channel,
      and the Playwright sign-out test still passes
- [ ] `make app-config`, `make moderate` and the Keycloak seed scripts still
      work against the running stack — verified by running each — and any that
      reached the admin API through the public Keycloak port now use the admin
      port
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-68 and SHOULD-69,
both `[needs decision]` (open questions 1 and 2), and COULD-74. Runs before
[task 02](02-the-phone-reaches-the-stack.md) exposes the stack beyond
loopback.
