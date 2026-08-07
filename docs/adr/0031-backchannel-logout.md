# ADR-0031: Validate Keycloak's Back-Channel Logout token and end the matching session by sid

- **Status:** accepted
- **Date:** 2026-08-07

## Context

[ADR-0029](0029-silent-token-refresh.md) caps a Kalia session to the realm's
`ssoSessionMaxLifespan` (10 hours) and ends it the moment a refresh comes back
`invalid_grant`, but both are reactive: they only notice the Keycloak SSO
session is gone the next time the app happens to need a token. Between an
identity-provider-side logout — an admin revoking a session, another
relying party's own RP-initiated logout, an idle timeout — and that next
request, Kalia still shows the user signed in and still holds a refresh token
that, until it is actually used, looks live. ADR-0029 named this gap and
deferred closing it to this task; [ADR-0030](0030-per-session-token-storage.md)
supplied the prerequisite, keying stored sessions so that ending one no longer
risks ending the wrong device's.

OpenID Connect Back-Channel Logout 1.0 is Keycloak's mechanism for the other
direction: the identity provider POSTs a signed Logout Token, server to
server, to a URL registered on the client. Nothing about it is specific to a
Kalia UI or browser tab, and the endpoint that receives it is necessarily
unauthenticated — the token's own signature is what stands in for a session
cookie neither side has.

## Decision

**Kalia registers a Back-Channel Logout endpoint, and ends the local session
whose Keycloak SSO session id (`sid`) matches a Logout Token that passes
validation.**

- `keycloak/realm-export.json`'s `kalia-frontend` client sets
  `backchannel.logout.url` to the endpoint (reached at the compose network's
  `frontend:3000`, the same address Keycloak already can't avoid using for
  container-to-container traffic) and `backchannel.logout.session.required`
  to `true`, which is what makes Keycloak include `sid` in the Logout Token at
  all.
- Validation (`frontend/lib/auth/backchannelLogoutToken.ts`) checks, in order:
  the JWS signature against Keycloak's own JWKS, `iss` and `aud`, that an
  `events` claim names the fixed backchannel-logout event, that no `nonce`
  claim is present, and that `sid` is a string. The first four are what the
  OIDC spec calls out as distinguishing a real Logout Token from an ID Token
  replayed as one; the last is this implementation's own requirement, because
  `sid` is the only key the session index below can look up.
- `sub` alone is deliberately not an accepted fallback. Indexing by `sub`
  would mean indexing by user, which ADR-0030 undid for exactly the
  multi-device reason still true here: a lookup that can return more than one
  device's session is the bug that ADR fixed, and accepting a `sid`-less token
  would reopen it for this one caller.
- The session index (`putSessionSid`/`getSessionTokenBySid` in
  `frontend/lib/auth/valkeyAdapter.ts`) is written once, in the same
  `events.signIn` hook ADR-0030 uses for the token set, by decoding `sid` out
  of the id_token already in hand (`frontend/lib/auth/sessionId.ts`) — no new
  round trip. `deleteSession` removes both the forward and reverse index
  entries it owns, so a session already ended by any path leaves nothing for
  a later Logout Token to find.
- A validated token naming an `sid` with no matching session is not an error:
  the endpoint answers `200` either way. Whether a session existed is not
  information this endpoint should confirm or deny back to the caller.

## Alternatives considered

**Do nothing beyond ADR-0029's cap and hope reactive coverage is close
enough.** It is the status quo this task exists to close: a session can
outlive its Keycloak SSO session by up to the full 10-hour maximum, an
uncomfortably long window for something OIDC has a standard mechanism to
close within one request. Rejected.

**Poll Keycloak's admin API for still-live sessions.** Would need an
inventory of every local session, a scheduler, and admin credentials the app
doesn't otherwise hold — machinery this problem doesn't need when Keycloak
already offers to push the notification. The same shape of alternative was
rejected for token refresh in ADR-0029 on the same grounds
([ADR-0027](0027-process-weight.md)).

**Front-Channel Logout** (an iframe Keycloak loads in the browser at logout
time) **instead of Back-Channel.** Needs a live browser tab to run the
notification, so it can't reach a session whose tab is already closed —
precisely the case this task is closing. The product owner named Back-Channel
Logout for task 10 specifically; front-channel was not a live option.

**Accept `sub` as a fallback when `sid` is absent, ending every session for
that user.** Closer to a real alternative than the others, since Keycloak's
spec permits a Logout Token with only `sub`. Rejected: it would silently
widen scope from "one SSO session ended" to "sign this user out everywhere,"
undoing ADR-0030's per-device precision for this one caller. The realm pins
`backchannel.logout.session.required: true` specifically so this case does
not arise in practice.

## Consequences

- Good, because the propagation gap ADR-0029 named is closed: a Keycloak-side
  logout now ends the matching Kalia session within one request instead of up
  to 10 hours later.
- Good, because the endpoint's only trust anchor is the Logout Token's
  signature, verified against Keycloak's own published keys — no shared
  secret of its own to provision or rotate.
- Bad, because this is a new *unauthenticated* endpoint, and its correctness
  now depends on `jose`'s JWKS/JWT verification behaving as documented and on
  the realm's three `backchannel.logout.*` attributes staying set. If
  `backchannel.logout.session.required` were ever turned off, Keycloak could
  send a Logout Token with no `sid`; this implementation treats that as
  invalid rather than falling back to `sub`, so the notification would be
  accepted (`200`) but end nothing.
- Neutral, because `jose` moves from a transitive dependency (pulled in by
  `next-auth`/`@auth/core`) to a direct one. Nothing about its resolved
  version changes; only that a future `next-auth` upgrade no longer
  implicitly governs it.
- **Revisit trigger:** wanting a Keycloak-side logout to end *every* device's
  session for that user rather than just the one named — the case ADR-0030
  moved this same trade-off away from — or turning off
  `backchannel.logout.session.required`.

## Evidence

Measured against `jose@6.2.8` (resolved via the `^6.2.4` floor in
`frontend/package.json`), `quay.io/keycloak/keycloak:26.7.0`,
`next-auth@5.0.0-beta.32`, in this repo's docker-compose stack.

- **The realm attributes are the ones the admin API actually reports back.**
  After `docker compose up -d --force-recreate keycloak` with the edited
  `keycloak/realm-export.json`, `GET /admin/realms/kalia/clients` on the
  `kalia-frontend` entry returned `backchannel.logout.url`,
  `backchannel.logout.session.required: "true"` and
  `backchannel.logout.revoke.offline.tokens: "false"` verbatim.
- **The E2E regression guard genuinely depends on the realm wiring, not just
  the endpoint's own logic.** With `backchannel.logout.url` removed from the
  realm export and Keycloak recreated, `frontend/e2e/sign-in-out.spec.ts`'s
  new "Keycloak ending the SSO session ends the matching Kalia session" test
  fails — the local session outlives the admin-triggered Keycloak logout,
  which is exactly the defect this ADR closes. Restoring the attribute and
  recreating Keycloak again makes it pass.
- **`jose`'s JWT signing throws under this project's default Vitest
  environment.** `frontend/vitest.config.ts` sets `environment: "jsdom"`
  globally; signing a JWT there throws `TypeError: payload must be an
  instance of Uint8Array` from `jose`'s own `instanceof` check on the payload
  it just encoded — jsdom's `Uint8Array` is a distinct realm from Node's.
  `frontend/lib/auth/backchannelLogoutToken.test.ts` and
  `frontend/lib/auth/sessionId.test.ts`, the two files that call `SignJWT`,
  override this per-file with `// @vitest-environment node`; `jwtVerify` and
  `decodeJwt` themselves are unaffected; only signing a token to test against
  needed the override.
- **Keycloak's `start-dev --import-realm` re-creates every realm user, with a
  new internal id, on every container restart** — there is no persistent
  store behind it in this dev stack. Recreating the `keycloak` container
  without also clearing Valkey reproduced `OAuthAccountNotLinked` on the next
  sign-in: Auth.js's `getUserByAccount` found no Kalia user for the *new*
  Keycloak subject, fell back to `getUserByEmail`, and refused to
  auto-link onto the Kalia user still linked to the *previous* boot's
  subject. Unrelated to this ADR's decision and pre-existing behaviour of the
  dev stack, but worth recording since it will resurface for anyone
  restarting only Keycloak: `docker compose exec valkey valkey-cli FLUSHALL`
  clears it.
