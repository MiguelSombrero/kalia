# Task 19: Decide how far the admin role reaches

- **Status:** needs-refinement
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

## Open questions

- **Non-functional.** For the role in the mobile token, SHOULD-103's options:
  the admin rule also requires `azp == kalia-web`, pinned by a test with a
  `kalia-mobile` token; an explicit `kalia-mobile` scope list without `roles`,
  checked by the realm drift check; or accept it and amend ADR-0101's
  consequence and ADR-0095's revisit trigger to name admin.
- **Non-functional.** For the metrics endpoint, COULD-126's: require `admin` on
  `/actuator/**` except health, or record in ADR-0088 that the network is the
  boundary.
- **Constraints.** Whether the product owner will ever want admin on the phone;
  that is the cost of the strictest option.

## Acceptance criteria

- [ ] An ADR amendment records the decision for each of the two, passes
      `node scripts/check-adrs.mjs`, and amends ADR-0101
- [ ] A test pins the chosen behaviour for a `kalia-mobile` token carrying the
      admin role at `/api/v1/admin/**`, and failed before the change unless the
      decision is to accept it
- [ ] A test pins the chosen behaviour of `/actuator/prometheus` for an ordinary
      signed-in user, and `/actuator/health` stays open
- [ ] `make keycloak-check` passes, if the realm changed
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-103 and COULD-126,
both `[needs decision]`. A decision task that carries its change, because the
change is small once the decision is made.
