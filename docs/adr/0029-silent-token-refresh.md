# ADR-0029: Renew access tokens lazily, and end the session when the grant is gone

- **Status:** accepted
- **Date:** 2026-08-07
- **Amended:** 2026-08-07 by [ADR-0030](0030-per-session-token-storage.md) —
  renewal reads and writes the token set of the caller's session rather than
  the user's, and Back-Channel Logout moved to iteration 4 task 10

## Context

Keycloak's access tokens live 300 seconds while a Kalia session lives far
longer, and nothing renewed them. [ADR-0025](0025-authjs-valkey-adapter.md)
left this open: Auth.js exposes the provider's tokens and leaves renewal to
the application, and its Adapter interface has no `updateAccount` to write a
renewed set back with.

[ADR-0028](0028-resource-server-and-current-user.md) turned that gap into a
visible defect. Spring Security authenticates a bearer token *before* it
decides whether the route is public, so an expired token makes even the
anonymous catalog answer 401. The stopgap was to withhold expired tokens
entirely: browsing kept working, but every protected call went out anonymous
five minutes after sign-in, and the UI still showed the user as signed in.

Two further forces shape the answer. Renewal can fail for opposite reasons —
the grant is genuinely gone, or Keycloak is merely unreachable — and treating
them alike is how a restart becomes a mass sign-out. And the local session's
lifetime was never tied to the Keycloak SSO session behind it: Auth.js's
default is 30 days, against realm defaults of 30 minutes idle and 10 hours
maximum.

## Decision

**Renew the access token lazily, at the moment a request needs one, and treat
`invalid_grant` — and only `invalid_grant` — as the end of the local session.**

- Renewal happens in `frontend/lib/api/accessToken.ts`, the single point every
  backend call already passes through, rather than in a session callback or a
  background job. A token is renewed when it has expired or is within the
  in-flight leeway; an unexpired one is returned untouched, so the common path
  costs nothing. This replaces the withholding stopgap, which is removed.
- The token-endpoint exchange is the one hand-written OAuth request in the
  codebase. ADR-0025 confines the rest of the protocol to Auth.js and that
  still holds; a refresh grant is a single form POST with no
  redirect, state, nonce or PKCE surface of its own.
- **Failure is split in two.** `invalid_grant` means the grant is gone —
  expired, revoked, or its SSO session ended — and the session goes with it.
  Every other failure, including an unreachable Keycloak, a 5xx, and
  `invalid_client`, leaves the session alone and costs only this one request
  its token. Signing users out over our own misconfiguration or a restart is
  the worse failure.
- Ending a session deletes its server-side record only. This runs during
  Server Component rendering, where Next.js forbids setting cookies, so the
  cookie is left orphaned — it resolves to nothing and the *next* render shows
  the user signed out.
- **The local session is capped to the realm's `ssoSessionMaxLifespan`**, and
  the realm's token and session lifetimes are pinned explicitly in
  `keycloak/realm-export.json` rather than inherited. The session is made
  *absolute* rather than sliding, matching Keycloak's own maximum, by setting
  Auth.js's session `maxAge` and `updateAge` to the same value. The cap is
  belt-and-braces, not the mechanism — nothing here measures idleness, so what
  ends an idle session is still the refresh failing.
- Concurrent renewals are left to race rather than locked, on the realm's
  `revokeRefreshToken: false` — now pinned for that reason.

Out of scope: proactive renewal ahead of a request, and OIDC Back-Channel
Logout. The latter is the proactive counterpart to this ADR's reactive
mechanism and is noted against iteration 4 task 9.

## Alternatives considered

**Renew in Auth.js's `session` callback.** Puts renewal on every `auth()`
call, including the many that only render a user's name and never touch the
backend, and spends a Keycloak round trip on requests that need no token.
Rejected: more work, in more places, for the same result.

**Refresh proactively on a timer or in a background job.** Keeps tokens warm
independently of traffic, but needs a scheduler, an inventory of live
sessions, and its own failure handling — none of which exists — to solve a
problem the lazy path already solves at the point of use. Rejected as
disproportionate ([ADR-0027](0027-process-weight.md)).

**Treat every refresh failure as fatal to the session.** Simpler by one
branch, and wrong: a Keycloak restart or a transient 502 would sign out every
signed-in user at once. Rejected.

**Leave the session alive on `invalid_grant` and just serve no token.** The
status quo, and the state Back-Channel Logout exists to prevent — the identity
provider has ended the session while the app still presents the user as signed
in. Rejected on both security and usability grounds.

**Lock renewals so only one is in flight per user.** Correct under refresh
token rotation, and unnecessary without it: the realm permits reuse, so
parallel renewals each receive a valid set and the last write wins. Rejected
as complexity bought against a setting we control and have pinned.

## Consequences

- Good, because a signed-in user keeps backend access for the life of the
  Keycloak SSO session instead of losing it after five minutes.
- Good, because `id_token` is refreshed alongside the access token, so
  sign-out's `id_token_hint` stays current — the failure iteration 4 task 4
  added a regression guard for.
- Good, because session cookie validity drops from 30 days to 10 hours, and
  the realm's lifetimes are now written down rather than inherited.
- Bad, because renewal happens inside a data-fetch path, which can now delete
  a session as a side effect. The split by failure kind is what keeps that
  safe, and it is only as good as Keycloak's error codes.
- Bad, because a rejected refresh leaves the UI signed-in for the remainder of
  the current render; the user sees the change on their next navigation.
- Neutral, because renewal is unlocked and therefore depends on
  `revokeRefreshToken: false` staying false.
- **Revisit trigger:** enabling refresh token rotation in the realm, or
  adopting Back-Channel Logout — the first makes the lock necessary, the
  second makes `invalid_grant` the rare path rather than the common one.

## Evidence

The realm settings pinned in `keycloak/realm-export.json` were read back from
the running Keycloak 26.7.0 admin API (`GET /admin/realms/kalia`) before being
written down, confirming they record its actual defaults and change no
behaviour: `accessTokenLifespan` 300, `ssoSessionIdleTimeout` 1800,
`ssoSessionMaxLifespan` 36000, `revokeRefreshToken` false.

Auth.js's session defaults are `@auth/core`'s `lib/init.js`: `maxAge` of
`30 * 24 * 60 * 60` and `updateAge` of `24 * 60 * 60`. Its re-dating condition
is `lib/actions/session.js`: a session is rewritten only once
`session.expires - maxAge + updateAge` is in the past, so equal values never
come due and the session is absolute rather than sliding.

That Next.js forbids setting cookies during Server Component rendering, which
is why an ended session leaves its cookie behind, is stated in
`next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.
