# Task 11: Lockout on password guessing

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

`keycloak/realm-export.json` sets no `bruteForceProtected`, and Keycloak's
default is **off**. Nothing anywhere in the stack counts a failed sign-in, so
an unlimited number of password guesses can be made against any account, in
every environment including whatever gets deployed first. Three things
compound it:

- **The username is a valid login identifier.** `loginWithEmailAllowed` is
  unset and Keycloak defaults it on, so either a username or an email signs in.
- **Usernames are not secret and were never going to be.** Self-registration is
  on ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) with unique
  usernames, so the registration form reports a taken name; and from this
  iteration on, the front page lists them
  ([task 03](03-front-page-feed.md)).
- **The password policy is `length(8)` and nothing else** — no composition
  rule, no breach-list check
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md) chose length
  over composition deliberately, which is right, and which leans harder on
  there being a lockout).

This is why the feed publishing usernames is safe: the answer to "an attacker
knows the account names" is lockout, not secrecy. But that answer has to
actually exist, and right now it does not — which makes it this iteration's
business rather than a general hardening wish.

[Quality backlog SHOULD-25](../quality-backlog.md) has carried the missing
`bruteForceProtected` since 2026-09-05, alongside two other realm findings that
stay there.

## Scope

Brute-force protection configured on the realm, with the thresholds and the
lockout behaviour chosen deliberately, and a test that proves an attacker is
actually stopped rather than that a flag is set.

## Non-goals

- Rate limiting anywhere else in the stack — the back-channel logout route's
  unauthenticated RS256 verification, the catalog's anonymous reads, the feed's
  own public endpoint. That is
  [quality backlog SHOULD-27](../quality-backlog.md) and it is an architecture
  choice (route handler, a reverse proxy that does not exist, or the edge)
  rather than a realm setting.
- Splitting the dev realm from a deployable one, and the `sslRequired` default
  — the rest of
  [SHOULD-25](../quality-backlog.md), still `[needs decision]`.
- MFA. A bigger product decision, and lockout is the thing whose absence is
  currently load-bearing.
- Changing the password policy.

## Constraints

- **Realm configuration is applied through `kcadm`, not by hand-editing a realm
  export that is then imported**
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)) —
  whatever this sets follows that mechanism, and is idempotent for the same
  reason the seeded account is.
- `keycloak/realm-export.json` is simultaneously the dev realm and the repo's
  only realm definition ([quality backlog SHOULD-25](../quality-backlog.md)),
  so a setting added here is a setting every environment gets. That is the
  argument for setting it and the reason to pick thresholds that do not make
  local development painful.
- **Lockout is a denial-of-service lever pointed at your own users.** With
  usernames public from this iteration on, permanent lockout means anyone can
  lock anyone out of their account by failing to sign in as them. Temporary
  lockout with a growing wait does not have that property. This is the trap and
  it is the reason `permanentLockout` is a question below rather than a
  default.
- The E2E suite signs in repeatedly against the same accounts
  ([iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md));
  a threshold that a parallel Playwright run can trip turns a security control
  into a flaky suite. Verify against a full `npm run test:e2e`, not only a
  single spec.

## Open questions

1. **Temporary or permanent lockout?** Permanent means an administrator has to
   unlock, and with public usernames it hands anyone a way to lock anyone out.
   Temporary with an increasing wait is the usual answer; permanent is
   defensible only with a self-service unlock path, which Kalia does not have.
2. **What thresholds?** Failures before lockout, the initial wait, how it
   grows, and how long the failure count is remembered. Keycloak's own defaults
   (30 failures, 60s initial wait, doubling, 12h) are a starting point, not
   obviously the right one for an app with this password policy.
3. **Does a locked account say so?** Telling the user is kinder and confirms to
   an attacker that the account exists — though the registration form already
   confirms that, so the usual argument for silence is weaker here than it
   normally is.
4. **Is the same threshold right for dev?** A developer mistyping their own
   password three times in a local stack should not be locked out of their own
   machine for an hour.
5. **Does anything observe it?** A lockout that nobody can see is also an
   attack nobody can see. Kalia has no metrics ([backlog](../backlog.md)), so
   the honest answer may be "not yet" — worth saying rather than assuming.

## Acceptance criteria

- [ ] Repeated failed sign-ins lock the account according to the chosen policy
      — automated test driving real failed sign-ins against the running
      Keycloak, confirmed to fail against the current realm
- [ ] A locked account recovers exactly as question 1 decides, and that
      recovery is exercised rather than assumed — the same test signs in
      successfully after the wait
- [ ] The setting is applied by the `kcadm` mechanism
      ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)) and
      is idempotent — applying it twice to a realm that already has it changes
      nothing, verified by running it twice
- [ ] A full `npm run test:e2e` passes with the policy live, proving the
      threshold does not trip on the suite's own repeated sign-ins
- [ ] `docs/architecture.md` §6 records that the realm has brute-force
      protection and what the policy is
- [ ] `make verify` is green

## Notes

Provenance: raised by the product owner on 2026-09-12 while deciding that the
feed names people by username
([dropped task 10](10-person-display-name.md)) — lockout is the control that
makes public usernames safe, and it was missing.

Lifts the brute-force half of
[quality backlog SHOULD-25](../quality-backlog.md). The rest of that finding —
the dev/deployable realm split and `docker-compose.yml`'s `sslRequired` default
of `none` — stays in the backlog, still `[needs decision]`.
