# ADR-0030: Store the Keycloak token set per session, not per user

- **Status:** accepted
- **Date:** 2026-08-07

## Context

[ADR-0025](0025-authjs-valkey-adapter.md) stored the provider's token set as
one record per user, and refreshed it on every sign-in through an
`events.signIn` hook. That hook existed to fix a real defect — Auth.js links an
account once and never updates it, so the tokens otherwise froze at the user's
first-ever sign-in — but it fixed staleness by making the newest sign-in
overwrite whatever was there.

With one device that is invisible. With two, the record holds only the most
recent sign-in's tokens, and every consumer of it is answering for the wrong
browser. Sign-out is where it bites: the `id_token_hint` it sends names the
*other* device's Keycloak session, so Keycloak ends that one and the browser
that clicked "Sign out" is still authenticated at the identity provider — its
next "Sign in" sails through with no credential prompt. This is iteration 4's
own "a user can sign in and out" failing, not polish.

The obstacle is that Auth.js hands over the two halves separately. The Adapter's
`createSession` receives the session and no tokens; `events.signIn` receives the
tokens and no session; and the Adapter interface has no `updateAccount` at all.

## Decision

**A stored Keycloak token set belongs to one Auth.js session, keyed by its
session token, and lives and dies with it.**

- Every consumer resolves the caller's session token from the Auth.js session
  cookie and reads the token set under it. Nothing looks tokens up by user id;
  that lookup is what could return another device's tokens, so it is gone
  rather than merely unused.
- The record carries the session's own expiry, and is deleted with the session.
  A renewal writes back without touching that expiry — a refreshed access token
  must not extend the session that holds it — and only if the record is still
  there, since a renewal is a round trip to Keycloak during which the session
  can end. A write that recreated it would leave a live refresh token under a
  key with no expiry at all.
- The Adapter's `linkAccount` records only the index `getUserByAccount` reads.
  Auth.js calls it before any session exists, so it is not a place tokens can be
  filed under one.
- **The two halves are joined with a request-scoped `AsyncLocalStorage`,**
  entered around the Auth.js route handlers: the Adapter's `createSession`
  deposits the session it just created, and `events.signIn` reads it back.
  Auth.js awaits session creation before firing the event, so the value is
  always in place. This is the part a reader would not derive from Auth.js's
  documentation, which is why it is named here.
- When Auth.js reuses an existing session rather than creating one — an
  already-signed-in user signing in again — the event writes nothing. That
  session keeps the tokens it has, which lazy renewal
  ([ADR-0029](0029-silent-token-refresh.md)) keeps current anyway.
- **The staleness ADR-0025's hook was written for cannot recur**, because a
  record now belongs to a single session and never outlives it. The hook
  remains only as the one point at which Auth.js surrenders the tokens at all.

Out of scope: OIDC Back-Channel Logout, which is the identity provider telling
*us* a session ended rather than the reverse. It needs this keying as its
prerequisite and is iteration 4 task 10.

## Alternatives considered

**Key the token set by Keycloak's `sid` claim.** Appealing because `sid`
identifies exactly the SSO session whose `id_token_hint` we need, and
`events.signIn` can read it out of the id_token with no extra plumbing.
Rejected because it moves the join rather than removing it: a request still has
to get from its Auth.js session to its `sid`, and nothing writes that link
without the same request-scoped capture. It buys nothing and adds a JWT decode.

**Adopt the token set lazily — keep writing a per-user record at sign-in, and
have the first request from a session claim it.** Avoids `AsyncLocalStorage`
entirely. Rejected as the same bug wearing a disguise: two sign-ins racing to
be claimed is precisely the multi-device case, and the loser adopts the
winner's tokens.

**Store the tokens inside the session record itself.** Then expiry and deletion
are free, with no second key to keep in step. Rejected because `updateSession`
merges a partial session and rewrites the record, so Auth.js would silently
drop the extra field on any path that re-dates a session.

**Throw when `events.signIn` finds no session to file tokens under, rather than
writing nothing.** Loud beats silent, and the wiring it guards does fail
silently. Rejected because the reachable case is a legitimate one — the
already-signed-in user signing in again — and a hard error there would be worse
than the no-op it replaces. The E2E suite is the guard instead.

## Consequences

- Good, because sign-out is a reliable sign-out once a second device exists,
  which is the acceptance criterion iteration 4 is measured against.
- Good, because a session's tokens are deleted with it, so a signed-out session
  leaves no usable refresh token behind — previously the per-user record
  survived any single sign-out.
- Bad, because correctness now depends on a wrapper in the auth route file whose
  absence fails silently: sign-in still succeeds, and only later does the
  session turn out to reach nothing. The comment there opens with "do not", and
  the E2E suite fails without it, but no type or test at the edit site does.
- Bad, because two code paths must agree on how the session token is derived —
  Auth.js's own cookie handling, and ours reading the same cookie. A future
  change to Auth.js's cookie naming breaks ours silently.
- Neutral, because `AsyncLocalStorage` is Node-runtime only. This app's auth
  route already requires it (`ioredis` speaks TCP), so nothing is lost today,
  but it forecloses moving these handlers to the edge runtime.
- **Revisit trigger:** Auth.js gaining an `updateAccount` on the Adapter
  interface, or otherwise passing the session to `events.signIn` — either
  removes the need for the request-scoped join.

## Evidence

Measured against `next-auth@5.0.0-beta.32`, `quay.io/keycloak/keycloak:26.7.0`,
Next.js 16.2, in this repo's docker-compose stack.

- **Auth.js creates the session before firing `events.signIn`, and the event is
  given no session.** `@auth/core`'s `lib/actions/callback/index.js` awaits
  `handleLoginOrRegister` — which is what calls the Adapter's `createSession`
  (`lib/actions/callback/handle-login.js`) — and only then calls
  `events.signIn?.({ user, account, profile, isNewUser })`. That argument list
  is the whole reason a request-scoped join is needed.
- **The token record really does expire with its session, including across a
  renewal.** After a sign-in and a forced renewal against the compose stack,
  `PTTL` on the pair read 35999004 ms for `auth:session:<token>` and 35998903 ms
  for `auth:session-account:<token>` — 101 ms apart, both the realm's 10-hour
  SSO maximum. Checked because an earlier reading showed the account key at
  `-1` (no expiry): that turned out to be the E2E helper patching the record
  with a plain `SET`, which drops the TTL, and not the application. The helper
  now patches with `KEEPTTL` so the test exercises what production stores.
- **`getAccount` is required only for WebAuthn.** `@auth/core`'s
  `lib/utils/assert.js` lists it under `webauthnMethods`, not `sessionMethods`,
  and its only caller is `lib/utils/webauthn-utils.js`. It was removed rather
  than left returning a per-user answer this model cannot give.
- **The multi-device defect reproduces, and the new E2E guard catches it.**
  `frontend/e2e/sign-in-out.spec.ts`'s two-browser-context test was run against
  the pre-decision build and failed at the laptop's sign-out: the click never
  produced a signed-out page, because the `id_token_hint` sent named the
  phone's Keycloak session. One browser context cannot reproduce it.
- **This did not make the E2E suite safe to run in parallel.** Removing
  `mode: "serial"` fails 3 of 5 tests against the pre-decision build and 1–2 of
  6 after it — always a test that cycles sign-in and sign-out, always with the
  browser landing back on Kalia still rendered signed in. Sequential sign-ins on
  two devices pass; overlapping authentication flows for one realm user do not.
  The token clobbering this ADR removes was therefore only half of that reason,
  and the suite stays serial until each spec has its own seeded realm user.
- **Concurrent first-ever sign-ins duplicate the user record.** Against an empty
  Valkey, two simultaneous sign-ins each find no user by account and each call
  `createUser`, leaving two `auth:user:*` records for one Keycloak subject with
  the account index resolving to whichever wrote last. Unrelated to this
  decision and pre-existing, but found while measuring the parallel run above;
  it is not the cause of the parallel failures, which reproduce with the user
  already present.
