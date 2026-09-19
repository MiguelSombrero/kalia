# ADR-0061: Brute-force lockout is temporary, growing, and disclosed to the person locked out

- **Status:** accepted
- **Date:** 2026-09-19

## Context

`keycloak/realm-export.json` set no `bruteForceProtected`, and Keycloak's own
default is off — an unlimited number of password guesses could be made
against any account. Three things compound it, all already true before this
decision: `loginWithEmailAllowed` is unset (Keycloak's default is on, so
either a username or an email signs in), usernames are not secret
(self-registration reports a taken name, and from this iteration on the front
page lists the usernames of people whose cellar is public — [task
03](../tasks/iteration-7/03-front-page-feed.md), [task
09](../tasks/iteration-7/09-feed-and-private-cellars.md)), and the password
policy is `length(8)` with no composition rule or breach-list check, a
deliberate choice ([ADR-0055](0055-self-registration-via-keycloak.md)) that
leans harder on there being a lockout. [Task
11](../tasks/iteration-7/11-keycloak-brute-force-protection.md) closes this;
this ADR records the two choices in it that a credible alternative was
rejected for.

**Permanent lockout is Keycloak's other supported mode, and the one most
brute-force guides default to recommending.** With usernames now public, it
inverts into a denial-of-service lever pointed at Kalia's own users: anyone
can permanently lock anyone else out of their account by deliberately failing
to sign in as them, and Kalia has no self-service unlock path. This is not
hypothetical only while nobody knows a username — the front page now hands
them out.

**Keycloak's own lockout message is deliberately generic.** The base theme's
`messages_en.properties` states the reason directly: `accountTemporarily-
DisabledMessage` is "deliberately the same as invalidUsernameMessage, so by
default it is not possible to recognize the reason of failed authentication
is [a] temporarily disabled account" (Evidence). That default assumes the
account's existence is worth protecting from an attacker probing it — true
for most Keycloak deployments, false for Kalia's from this iteration on: the
front page already discloses which usernames are real. Telling a genuinely
locked-out person so, rather than repeating "invalid credentials" at them,
also shortens their own lockout — a person who cannot tell the two apart
keeps guessing, which is exactly the failure mode the growing wait is meant
to discourage.

## Decision

**The realm locks an account temporarily and with a growing wait after
repeated failed sign-ins, never permanently, and the Kalia theme overrides
Keycloak's own login message so a locked-out person is told so.**

- `keycloak/realm-export.json`: `bruteForceProtected: true`,
  `permanentLockout: false`, `failureFactor: 10`, `waitIncrementSeconds: 60`,
  `maxFailureWaitSeconds: 900` (15 minutes), `maxDeltaTimeSeconds: 43200` (12
  hours), `quickLoginCheckMilliSeconds: 1000`,
  `minimumQuickLoginWaitSeconds: 60`. One policy, every environment — the
  same reason [ADR-0054](0054-keycloak-config-cli-realm-management.md) gives
  for every other realm setting in that file.
- `keycloak/themes/kalia/login/messages/messages_{en,fi}.properties`
  overrides `accountTemporarilyDisabledMessage` to name the lockout instead
  of repeating the invalid-credentials text.
- This does not extend to `accountPermanentlyDisabledMessage`: with
  `permanentLockout: false` that branch cannot occur through ordinary use,
  and leaving it at Keycloak's default costs nothing.

## Alternatives considered

**Permanent lockout after repeated failures**, Keycloak's other built-in
mode and the default most brute-force guides recommend without qualification.
Rejected for the reason in Context: it is safe only while account names stay
private, and this iteration ends that. Kalia also has no admin-unlock UI, so
a permanently locked account would need direct `kcadm`/console intervention
to ever sign in again — an operational cost with no upside once the DoS
angle is accounted for.

**Leave Keycloak's generic lockout message as-is**, and let a locked-out
person read "invalid credentials" like any other failure. Rejected: nothing
is gained by hiding the reason once the account name itself is not secret,
and a person who cannot tell "wrong password" from "temporarily locked" has
no reason to stop guessing — which lengthens their own lockout rather than
anyone else's exposure. The generic message earns its keep on a Keycloak
realm where the account name is the thing being protected; that is not this
realm from this iteration on.

## Consequences

- Good, because an attacker who already knows or guesses a username (which
  the front page now hands out for public cellars) cannot make an unbounded
  number of password attempts against it, and a real user who mistypes their
  own password is not at risk of losing the account.
- Good, because the disclosed message shortens a genuine lockout instead of
  inviting more attempts against it.
- Bad, because overriding a security-motivated upstream default needs
  re-justifying if Keycloak's own reasoning for it changes, or if a future
  iteration makes some usernames secret again (self-service private
  registration without a public profile, say) — at which point this ADR's
  premise (usernames are already public) needs revisiting alongside it.
- Neutral, because the thresholds are a judgment call between developer
  convenience and attacker cost, not a value derived from a measurement;
  [task 11](../tasks/iteration-7/11-keycloak-brute-force-protection.md)
  records the product owner's reasoning for the specific numbers.
- **Revisit trigger:** a future task that makes some or all usernames
  private again, which would remove this decision's premise for disclosing
  the lockout message (though not for keeping the lockout temporary).

## Evidence

Measured directly against `quay.io/keycloak/keycloak:26.7.0`
(`keycloak-themes-26.7.0.jar`, `theme/base/login/messages/messages_en.properties`),
2026-09-19:

```
# These properties are deliberately the same as "invalidUsernameMessage", so by default, it is not possible to recognize the reason of failed authentication is temporarily disabled account
accountTemporarilyDisabledMessage=Invalid username or password.
```

Confirmed end to end against the running realm: 10 failed direct-grant
sign-ins (spaced past `quickLoginCheckMilliSeconds` so the exponential
`failureFactor` path is what's exercised, not the separate rapid-retry wait)
each return the ordinary `invalid_grant`/`Invalid user credentials`; the
11th, submitted through the browser login form even with the *correct*
password, returns the kalia theme's overridden message instead of a
redirect; and a sign-in attempt after the 60-second wait elapses succeeds
with no administrator action. `frontend/e2e/brute-force-lockout.spec.ts`
pins this as an automated test.
