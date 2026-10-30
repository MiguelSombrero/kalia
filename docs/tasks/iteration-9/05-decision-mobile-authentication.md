# Task 05: Decide how the mobile app authenticates

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-5

## Why

Kalia's authentication is shaped for a browser behind a BFF: a confidential
Keycloak client with a secret, tokens kept server-side in Valkey
([ADR-0030](../../adr/0030-per-session-token-storage.md)), silent refresh in
the BFF ([ADR-0029](../../adr/0029-silent-token-refresh.md)) and back-channel
logout to a container ([ADR-0031](../../adr/0031-backchannel-logout.md)). None
of that carries over. A native app cannot keep a secret, holds its own tokens,
calls Spring directly, and cannot be reached by back-channel logout at all, so
it has to end its own session when a refresh fails.

Two questions were deferred here on purpose. [Iteration 8.5 task 13](../iteration-8.5/13-sessions-and-stack-credentials-hardened.md)
left refresh-token rotation (`revokeRefreshToken`) to be chosen for both
clients at once. And [quality backlog](../quality-backlog.md) COULD-65 notes
that an access token outlives sign-out by up to its lifespan — harmless while
the BFF throws its copy away, not once a lost phone holds one.

## Scope

Mobile authentication is a recorded decision: whether the app calls Spring
directly, the Keycloak client's shape, how long a mobile session lives and how
it is refreshed and ended, where the tokens are kept, refresh-token rotation
for both clients, and COULD-65's answer.

## Non-goals

- Configuring the client — [task 13](13-keycloak-mobile-client.md).
- Building sign-in — [task 14](14-sign-in-on-mobile.md).
- How a real phone reaches Keycloak on the Mac, and what the issuer becomes —
  [iteration 10](../iteration-10.md).
- Biometric unlock, and sign-in with Apple or Google.

## Constraints

- The backend is a resource server checking signature, `iss` and `aud`
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)); a mobile
  token without a `kalia-backend` audience mapper fails that check and
  presents as a broken sign-in, not as a missing mapper.
- Realm configuration is managed by keycloak-config-cli under a drift check
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)).
- [ADR-0003](../../adr/0003-bff-pattern.md)'s consequences "no CORS surface"
  and "the Spring API is not exposed publicly" stop being system-wide truths;
  the ADR is amended, not contradicted.
- [ADR-0029](../../adr/0029-silent-token-refresh.md) records why the web keeps
  refresh-token reuse until this decision.
- An OAuth library for the app is a new dependency — asked, not researched.

**Decided at refinement, 2026-10-30** (product owner):

- **The app calls Spring directly, through the edge proxy** — the one public
  entry, bounding the app's anonymous calls the way it bounds the web's
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
  The ADR records why a mobile BFF was rejected.
- **A public `kalia-mobile` client with PKCE and no secret,** with exactly
  listed redirect URIs — never a `kalia://` wildcard, the usual
  open-redirect foothold — and its own `kalia-backend` audience mapper.
- **The session is an offline token (`offline_access`) that lapses after 30
  days unused, with no maximum while in use.** A longer regular session was
  rejected because it would lengthen the web's too.
- **Mobile refresh tokens rotate; the web keeps reuse,** for the
  two-tabs-refresh-at-once reason [ADR-0029](../../adr/0029-silent-token-refresh.md)
  records. If Keycloak can set rotation only realm-wide, the task building
  the client stops and returns to the product owner rather than choosing.
- **COULD-65 is accepted as an [§8](../../architecture.md) trade-off and
  retired:** an access token keeps working for up to its 5-minute lifespan
  after sign-out or an account disable.
- **Sign-out forgets the tokens on the device at once, and revokes them at
  Keycloak, ending the session, when there is a connection.** Offline,
  sign-out still completes on the device and the server session lapses at
  its idle timeout.
- **Sign-in happens in the system browser,** as the OAuth guidance for
  native apps expects; an embedded web view is rejected. Sign-up is
  reachable from Keycloak's own sign-in page, exactly as on the web
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)).
- **Tokens are kept in the platform's secure storage** — Keychain on iOS,
  Keystore on Android.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records the decision, the rejected alternatives and their costs,
      and passes `node scripts/check-adrs.mjs`
- [ ] ADR-0003 and ADR-0029 are amended where the decision changes what they
      state, and COULD-65 is retired or re-scoped in the quality backlog
- [ ] `docs/architecture.md` §6 describes the mobile client alongside the web
      one
- [ ] Each test the decision implies — a mobile-shaped token passing the
      audience check, a failed refresh ending the session — is named in the
      acceptance criteria of tasks [13](13-keycloak-mobile-client.md) and
      [14](14-sign-in-on-mobile.md) before either is refined

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decisions 1 and 3;
[iteration 8.5 task 13](../iteration-8.5/13-sessions-and-stack-credentials-hardened.md)'s
deferral; COULD-65. A decision task, so it adds no automated test of its own —
see [iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
