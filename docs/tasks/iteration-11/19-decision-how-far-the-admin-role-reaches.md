# Task 19: Decide how far the admin role reaches

- **Status:** done
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

The admin role of [iteration 10.5](../iteration-10.5.md) is a realm role in the
access token, enforced by the backend on `/api/v1/admin/**`
([ADR-0101](../../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
Two consequences were left unweighed.

- **The role rides in the app's offline refresh token** (SHOULD-103), which never
  rotates and has no maximum lifespan: `keycloak/realm-export.json` sets
  `revokeRefreshToken: false` and `offlineSessionMaxLifespanEnabled: false`;
  `kalia-mobile` pins no client scopes, so it inherits `roles`; the app asks for
  `offline_access`. ADR-0101 admits the role from any client and calls the mobile
  token carrying it "Neutral", without weighing
  [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)'s
  accepted replay of a stolen phone's refresh token. An admin signed in on the
  phone — the product owner, on the one phone the app is on — holds an admin
  credential that works through the edge for as long as it is refreshed every 30
  days, against the web session's 10 hours.
- **`/actuator/prometheus` accepts any signed-in user's token** (COULD-126;
  `SecurityConfig.java`, and `ObservabilityIT` reads it with an ordinary user).
  Not exploitable today: the edge answers 404 for `/actuator/*`, and the BFF's
  transport refuses dot segments. The only protection is the network layout, and
  now that an admin role exists, "any self-registered account" is the wrong bar.

## Scope

An ADR records, for each, who may reach it and why, and the change that follows
is made.

## Non-goals

- New admin features, or any change to what an admin may do.
- Rotating the mobile refresh token for every user, which
  ADR-0095 accepted and a second user would reopen.

## Constraints

- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)): ADR-0101, and
  ADR-0095's revisit trigger or ADR-0088 where the answer touches them.
- A realm change is checked for drift between the realm export and the running
  Keycloak (`make keycloak-check`).
- Kalia adds no cost ([`CLAUDE.md`](../../../CLAUDE.md)).

**Decided at refinement, 2026-11-07** (product owner):

- **`kalia-mobile` gets an explicit client-scope list without `roles`,** so a
  token it is issued never carries the admin role; the realm drift check pins
  the list. Admin stays on the web. Keycloak's `roles` scope also carries the
  audience mapper, so the task first confirms the app's token still holds the
  audience the backend validates.
- **For `/actuator/**`, the network is the boundary.** The edge refuses every
  actuator path but health, a test pins that, and the backend permits the rest
  without a token on the stack's internal network, so a scraper needs no
  credential. ADR-0088 records it.
  [Iteration 11.5 task 01](../iteration-11.5/01-decision-the-local-observability-stack.md)'s
  scrape question is refined against this.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR amendment records the decision for each of the two, passes
      `node scripts/check-adrs.mjs`, and amends ADR-0101
- [x] A test shows a `kalia-mobile` token for an admin user carrying no admin
      role and refused at `/api/v1/admin/**`; it failed before the change
- [x] A test shows the backend answering `/actuator/prometheus` without a
      token, another the edge refusing every actuator path but health, and
      `/actuator/health` stays open
- [x] `make keycloak-check` passes with the realm changed
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-103 and COULD-126,
both `[needs decision]`. A decision task that carries its change, because the
change is small once the decision is made.
