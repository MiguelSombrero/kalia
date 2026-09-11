# ADR-0033: Allow email-based Keycloak account re-linking, since it is the only provider

- **Status:** accepted
- **Date:** 2026-08-08
- **Amended:** 2026-09-11 — narrows the decision to the case it actually still
  covers now that both of this ADR's premises have moved
  ([iteration 6.5 task 08](../tasks/iteration-6.5/08-revisit-account-linking.md)):
  [task 01](../tasks/iteration-6.5/01-persist-keycloak-state.md) closes the
  dev-reimport case this ADR was written against, and
  [task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)
  added a second Auth.js provider entry (`keycloak-register`) that this ADR's
  "only provider" sentence and revisit trigger did not anticipate. The flag
  stays set — see the updated Consequences — and the trigger is reworded so
  it actually fires for a second identity source instead of lapsing silently.

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

> **Amended 2026-09-11.** [Task 01](../tasks/iteration-6.5/01-persist-keycloak-state.md)
> moves Keycloak off `start-dev --import-realm` onto a persistent,
> Postgres-backed realm, which closes the dev-reimport case above: `sub` no
> longer changes on a plain restart. The production case — a Keycloak user
> deleted and recreated with the same email, an admin action this app does
> not control — is untouched by that fix and is the only case the Decision
> below still defends against.
>
> A second, unrelated gap in the account index surfaced independently:
> `frontend/lib/auth/valkeyAdapter.ts` keys `auth:account-index:<provider>:<sub>`
> by *provider id*, not just by `sub`. [Task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)
> added `keycloak-register` — a second Auth.js provider entry, same Keycloak
> realm and client — as the entry point for self-registration
> ([ADR-0055](0055-self-registration-via-keycloak.md)). A session created
> through `keycloak-register` writes its account-index entry under that
> provider id; that same person's next sign-in through the plain `keycloak`
> provider looks up a *different* key, misses, and only reaches their own
> account via the same `getUserByEmail` fallback and the same flag below.
> This is now the ordinary second sign-in of every self-registered account,
> not an edge case — see the Decision's amendment.

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

> **Amended 2026-09-11.** "Keycloak is the *only* provider this app
> registers" is no longer accurate as a literal count of provider entries —
> `frontend/auth.ts` registers two, `keycloak` and `keycloak-register` — and
> was already inaccurate as the safety argument even before that: what makes
> the flag safe is not the number of entries, it is that every entry
> authenticates against the *same* Keycloak realm and client, so the only way
> this code path is reached is still "the same identity source claims this
> email again," never a second, less-trusted source hijacking it. `keycloak-register`
> does not move that boundary — it is a second *entry point* into the one
> identity source this app has always trusted, reached through Keycloak's
> registration endpoint instead of its login one. The flag stays kept, now
> for two cases rather than one: the residual admin-recreation case in
> Context, and the `keycloak-register`/`keycloak` provider-id split above,
> which self-registered accounts hit on their very next sign-in. See the
> corrected Consequences and revisit trigger below for what a genuinely
> second identity source would mean instead.

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

> **Amended 2026-09-11.** The Neutral entry and trigger above read "a second
> provider" as "a second Auth.js provider entry," which
> [task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)'s
> `keycloak-register` satisfied literally without reopening the hijacking risk
> either bullet is actually about — see the Decision's amendment for why.
> Corrected:
>
> - Neutral, because `allowDangerousEmailAccountLinking`'s safety rests on
>   one *identity source*, not one Auth.js provider entry — see Decision.
>   `keycloak-register` does not reopen the hijacking risk this flag warns
>   about, and per Decision above is now load-bearing for an ordinary
>   self-registered sign-in too, not only the admin-recreation case.
> - **Revisit trigger:** a second identity source is added — a distinct
>   OAuth/OIDC issuer this app trusts directly, or one brokered into Keycloak
>   (e.g. Keycloak's own identity-brokering for Google or another IdP) via a
>   `first-broker-login` flow. A second Auth.js provider entry against
>   Keycloak's own realm and client — another `keycloak-register`-style
>   endpoint — does **not** trip this trigger on its own, since it moves no
>   trust boundary.
>
> Treated as a one-off correction rather than a general rule about revisit
> triggers: this is the first case on record of one lapsing without firing,
> and one instance does not yet justify a standing rule in
> [ADR-0019](0019-adr-format-and-conventions.md).

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
