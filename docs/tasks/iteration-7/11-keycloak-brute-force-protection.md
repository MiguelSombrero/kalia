# Task 11: Lockout on password guessing

- **Status:** refined
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
  ([task 03](03-front-page-feed.md)). *Refined 2026-09-12:* the feed lists only
  the usernames of people who made their cellar public
  ([task 09](09-feed-and-private-cellars.md)) — usernames
  [ADR-0050](../../adr/0050-public-cellar-addressing.md) already publishes in
  the URL those people are invited to share. The front page hands them out
  unasked, which is the new part; the premise of this task is narrower than
  first written but not removed.
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

**Decided 2026-09-12 by the product owner.**

- **Temporary lockout with a growing wait** (question 1). Permanent lockout is
  rejected for the reason the Constraints name: with usernames public, it hands
  anyone a way to lock anyone out, and Kalia has no self-service unlock path.
- **Thresholds: around 10 failures before lockout, a 60-second initial wait,
  doubling to a cap of about 15 minutes, and the failure count forgotten after
  12 hours** (question 2). Tighter than Keycloak's own 30-failure default,
  because the password policy is `length(8)` with no composition rule and no
  breach-list check
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)); looser than
  5-in-5-minutes, so a developer mistyping their own password is not locked out
  of their own machine and a stranger who knows your username cannot trivially
  make a nuisance of themselves. The exact numbers are the implementer's to
  confirm against `kcadm`'s actual attribute names; these are the intent.
- **The same policy in every environment** (question 4). `realm-export.json` is
  simultaneously the dev realm and the only realm definition, and the
  thresholds above were chosen so that does not hurt. Splitting a dev realm
  from a deployable one stays [quality backlog SHOULD-25](../quality-backlog.md).
  **Only failed sign-ins count**, so the E2E suite's repeated *successful* ones
  are unaffected — which the full-suite criterion below verifies rather than
  assumes.
- **A locked account is told so, and told roughly when to retry** (question 3).
  It leaks nothing the registration form does not already leak, and a person
  locked out by a generic "invalid credentials" will simply keep trying, which
  extends their own lockout.
- **Nothing observes it yet** (question 5), and the ADR-free answer is to say
  so rather than assume otherwise. Kalia has no metrics
  ([backlog](../backlog.md)); a lockout is visible only in Keycloak's own
  admin console. Recorded as a known gap, not closed here.

## Open questions

**None.**

## Acceptance criteria

- [ ] Repeated failed sign-ins lock the account according to the chosen policy
      — automated test driving real failed sign-ins against the running
      Keycloak, confirmed to fail against the current realm
- [ ] A locked account recovers on its own after the wait, with no
      administrator action, and that recovery is exercised rather than assumed
      — the same test signs in successfully afterwards
- [ ] A locked-out sign-in attempt tells the person the account is temporarily
      locked rather than returning a generic credential failure — asserted
      against the running Keycloak
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
