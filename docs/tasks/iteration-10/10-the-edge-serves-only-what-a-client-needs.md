# Task 10: The edge serves only what a client needs

- **Status:** needs-refinement
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

## Open questions

1. **Metrics (SHOULD-68):** move `prometheus` to the dev overlay, require a
   role or scope for it, or serve actuator on a management port the edge does
   not route.
2. **The master realm (SHOULD-69):** deny `/admin` and `/realms/master` at the
   edge and give the host scripts an internal route, set `KC_HOSTNAME_ADMIN`
   to an unpublished address, or at least enable brute-force protection for
   master — or more than one of those.
3. **Order with task 01:** must this land before the stack is reachable from
   the phone, or is a tailnet with one member an acceptable interim?

## Acceptance criteria

- [ ] Through the edge, `/actuator/prometheus`, `/admin`, `/realms/master` and
      `/api/auth/backchannel-logout` answer as refinement decides (404 or 403),
      checked by an automated test of the edge configuration
- [ ] Sign-out on the web still ends the session through the back-channel,
      and the Playwright sign-out test still passes
- [ ] `make app-config`, `make moderate` and the Keycloak seed scripts still
      work against the running stack — verified by running each
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-68 and SHOULD-69,
both `[needs decision]` (open questions 1 and 2), and COULD-74. Runs before
[task 02](02-the-phone-reaches-the-stack.md) exposes the stack beyond
loopback.
