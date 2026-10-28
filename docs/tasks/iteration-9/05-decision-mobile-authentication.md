# Task 05: Decide how the mobile app authenticates

- **Status:** needs-refinement
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

## Open questions

1. **Direct to Spring, or through a mobile BFF?** Direct is the expected
   answer ([backlog](../backlog.md#mobile-client) decision 1); the ADR records
   why a BFF was rejected.
2. **Through the edge proxy, or past it?** The anonymous edges are bounded by
   nginx ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)),
   and the app is a new caller of them.
3. **How long does a mobile session last?** `offline_access` with an offline
   token, or a longer regular session; and the refresh token's lifetime and
   idle timeout.
4. **Do refresh tokens rotate**, for the web and mobile both — and if so, what
   the web's BFF does when two tabs refresh at once.
5. **COULD-65: accept, shorten, or check?** Accept the access-token lifespan as
   an [§8](../../architecture.md) trade-off, shorten it, or have the backend
   check revocation.
6. **Sign-out on the device:** revoke the refresh token at Keycloak and end the
   SSO session, or only forget the tokens locally — and what happens when
   sign-out happens offline.
7. **The system browser for sign-in**, as the OAuth for native apps guidance
   expects, rather than an embedded web view — and whether sign-up
   ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) is reachable
   from the app's sign-in page.

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
