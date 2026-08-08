# ADR-0033: Allow email-based Keycloak account re-linking, since it is the only provider

- **Status:** accepted
- **Date:** 2026-08-08

## Context

`frontend/lib/auth/valkeyAdapter.ts` indexes a signed-in account by
`provider:providerAccountId` (Keycloak's `sub`), separate from the user
record indexed by email. Auth.js's own sign-in flow (`@auth/core`'s
`lib/actions/callback/handle-login.js`) looks up `getUserByAccount` by that
index first; only when it finds nothing does it fall back to
`getUserByEmail`, and when *that* finds an existing user it throws
`OAuthAccountNotLinked` instead of linking — unless the provider opts in via
`allowDangerousEmailAccountLinking`.

Keycloak's `sub` is not guaranteed stable for a given real person across the
lifetime of that index entry. The dev stack demonstrates it directly:
`docker-compose.yml`'s `keycloak` service runs `start-dev --import-realm`,
reimporting the realm fresh on every container start and handing `testuser`
a brand-new random UUID each time, while Valkey — a separate container with
its own lifecycle — keeps the old `auth:account-index:keycloak:<old-sub>`
entry pointing at the same email. The next real sign-in then misses at
`getUserByAccount`, hits at `getUserByEmail`, and throws — surfaced to the
user as `/api/auth/signin?error=OAuthAccountNotLinked`, with no way to
recover short of an operator deleting the stale Valkey key by hand. The same
failure is reachable in production too, any time a Keycloak user is deleted
and recreated with the same email — an admin action this app's own code does
not control.

## Decision

**Set `allowDangerousEmailAccountLinking: true` on the Keycloak provider
(`frontend/auth.ts`)**, so a sign-in that misses the account index but finds
an existing user by email links to that user instead of throwing.

This is safe specifically because Keycloak is the *only* provider this app
registers, and per [ADR-0028](0028-resource-server-and-current-user.md) it
is already the canonical identity source. The flag's danger is a second,
less-trusted provider claiming an email an existing account already owns, to
hijack it; with one provider, the only way this code path is reached at all
is "the same provider claims this email again, under a new account id" —
and Keycloak already gates its own accounts on a real mailbox. This does not
touch backend authorization: the resource server keys per-user data on the
token's `sub` directly (ADR-0028), never on this adapter's `user.id`, so it
is unaffected by which `user.id` a re-link lands on.

Once linked, Auth.js's own `linkAccount` call
(`handle-login.js`) writes a fresh `auth:account-index:keycloak:<new-sub>`
entry pointing at the pre-existing user — the flow self-heals on the very
next sign-in, no manual Valkey cleanup required.

## Alternatives considered

**Leave the default (`false`) and document manual Valkey cleanup.**
Rejected: it turns an ordinary Keycloak realm reset — the dev stack's
documented, intended behavior — into a sign-in outage requiring an operator
with `valkey-cli` access, in exchange for a security property (protection
against email-collision hijacking) that only matters with two or more
providers.

**A custom `signIn` callback that re-links only when `profile.email_verified`
is true**, instead of the built-in flag. Rejected: functionally the same
decision, reimplemented by hand in application code for behavior Auth.js
already ships, tests, and exposes as a documented opt-in with the same trust
boundary.

**Pin a fixed `id` for `testuser` in `keycloak/realm-export.json`**, so its
`sub` stops changing on reimport. Fixes only the dev symptom, not the
underlying gap: the same lockout is reachable in production if a real
Keycloak user is ever deleted and recreated, which no realm-export fixture
can prevent.

## Consequences

- Good, because a Keycloak realm reset — the dev stack's documented,
  expected behavior — no longer locks a returning user out of sign-in.
- Good, because the fix needs no data migration or manual cleanup; the next
  real sign-in self-heals the account index.
- Bad, because a stale `auth:account-index:keycloak:<old-sub>` entry is
  never removed — it simply stops being reachable, since Keycloak will not
  reissue an old `sub`. Harmless, but permanent clutter with no sweep.
- Neutral, because `allowDangerousEmailAccountLinking` is inherently a
  single-provider decision: adding a second OAuth/OIDC provider later would
  reopen the exact hijacking risk the flag's name warns about, and that
  addition must revisit this ADR rather than inherit the flag by default.
- **Revisit trigger:** a second sign-in provider is added.

## Evidence

Reproduced against the running docker-compose stack
(`quay.io/keycloak/keycloak:26.7.0`, `next-auth@5.0.0-beta.32`) on
2026-08-08, after `keycloak`/`frontend`/`backend` had restarted but `valkey`
had not:

- `docker exec kalia-valkey-1 valkey-cli KEYS 'auth:*'` showed
  `auth:account-index:keycloak:7f5faa43-6842-4b28-9303-957b8406644f`, while
  Keycloak's admin API (`GET /admin/realms/kalia/users?username=testuser`)
  reported the live `sub` as `7a670510-713f-488b-a4db-ac01ab3bfdc6` — the
  stale index was still pointing at a `sub` Keycloak no longer issues.
- Reading `@auth/core`'s installed `lib/actions/callback/handle-login.js`
  (`next-auth@5.0.0-beta.32`) directly: the OAuth branch calls
  `getUserByAccount` first; on a miss, `getUserByEmail`; on a hit there,
  throws `OAuthAccountNotLinked` unless
  `options.provider.allowDangerousEmailAccountLinking` is true, in which
  case it instead sets `user = userByEmail` and falls through to
  `linkAccount({ ...account, userId: user.id })`.
- With the flag set and the frontend image rebuilt, signing in as
  `testuser`/`testuser123` against the same stale Valkey state succeeded,
  and a new `auth:account-index:keycloak:7a670510-…` entry appeared
  alongside the old one, both resolving to the same user id.
