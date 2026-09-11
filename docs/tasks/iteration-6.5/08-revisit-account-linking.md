# Task 08: Revisit account linking now that both of ADR-0033's premises have moved

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-4

## Why

[ADR-0033](../../adr/0033-keycloak-account-relinking.md) set
`allowDangerousEmailAccountLinking: true` on the Keycloak provider. Both of the
things that made that safe change in this iteration.

**Its motivating problem largely disappears.** The ADR's Context is built on the
dev stack reimporting its realm on every start and handing `testuser` a new
`sub` each time, which strands the Valkey account index and locks the user out.
[Task 01](01-persist-keycloak-state.md) makes `sub` stable. The production-side
case the ADR also names — a Keycloak user deleted and recreated with the same
email — survives, but it is rarer than the one that drove the decision.

**Its safety argument is already inaccurate as written.** The ADR is explicit
that the flag is safe "specifically because Keycloak is the *only* provider
this app registers", and sets a revisit trigger: "a second sign-in provider is
added". [Task 05](05-self-registration-with-email-verification.md) added one —
`keycloak-register` in `frontend/auth.ts`, a second Auth.js provider entry
against the same realm and the same `kalia-frontend` client
([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) — and **the
trigger did not fire**, because a second entry for one identity source does not
read as "a second sign-in provider". The trust boundary genuinely did not move.
The ADR's sentence, and the comment repeating it above `keycloakOptions`, are
wrong all the same.

**And the flag has stopped being a recovery net.**
`frontend/lib/auth/valkeyAdapter.ts` keys the account index by provider id
(`auth:account-index:<provider>:<sub>`), so the session a registration
establishes through `keycloak-register` and that account's next sign-in through
`keycloak` do not share an entry: the sign-in misses `getUserByAccount`, falls
back to `getUserByEmail`, and reaches the right user *only* because
`allowDangerousEmailAccountLinking` is set. That is the ordinary second visit
of every account registered since task 05, not an edge case.
`frontend/e2e/sign-up.spec.ts`'s "register, verify, sign in, sign out, and sign
in again" would fail if the flag were removed — but it names none of this, so
what stands between a plausible cleanup and a sign-in outage is a test that
looks like it is about something else.

A revisit trigger that lapses without firing is worse than none, because it
reads as coverage. That is the drift this task exists to close, and it has to
be closed in the same iteration that creates it.

## Scope

Two decisions, recorded where [ADR-0020](../../adr/0020-documentation-roles.md)
says they belong: whether Auth.js keeps `allowDangerousEmailAccountLinking` now
that its original justification is gone and a different one has taken its
place, and how ADR-0033 has to be worded for a future second provider — a
brokered one, or another entry against Keycloak itself — to actually trip its
revisit trigger.

Whatever ADR-0033 says afterwards has to be true, including that trigger.

## Non-goals

- Adding a second identity provider.
  [Task 07](07-google-as-a-sign-up-route.md) (Google, brokered by Keycloak)
  was dropped on 2026-09-08; if one is ever added, what this task decides is
  what it inherits.
- A Kalia-side UI for linking or unlinking accounts.
- Changing how the backend identifies a user.
  [ADR-0028](../../adr/0028-resource-server-and-current-user.md)'s `sub` key is
  untouched by any answer here, which is precisely why the blast radius is
  bounded.

## Constraints

- **An accepted ADR is amended, not rewritten**
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)). ADR-0033 either
  gains a dated amendment or is superseded by a new ADR that says so.
- `node scripts/check-adrs.mjs` enforces the index and structure, and
  `docs/architecture.md` §9 and [docs/adr/README.md](../../adr/README.md) must
  agree with whatever changes.
- **This fails silently in the dangerous direction.** Account linking that is
  too permissive shows no error; it hands one person's cellar to another. The
  one suite that would notice today notices by accident (see `Why`), so the
  decision has to be pinned by a test written on purpose.
- Depends on [task 01](01-persist-keycloak-state.md) (stable `sub`) and
  [task 05](05-self-registration-with-email-verification.md) (the second
  provider entry, and the registration path the flag now carries) having
  landed. Task 05 has; task 01 has not.

## Open questions

**None.**

Resolved during refinement (2026-09-05):

1. **Does `allowDangerousEmailAccountLinking` stay?** Decided: yes, kept —
   for the narrower residual case (an admin deleting and recreating a
   Keycloak user with the same email). Removing it would reintroduce a
   lockout with no self-service recovery for that case.
2. **What does Keycloak's first-broker-login flow do on an email collision?**
   Decided: automatically link, when Google's `email_verified` claim is
   `true` (see question 3). This mirrors ADR-0033's existing reasoning for
   the Auth.js-level flag — the collision is only reachable because Google
   already gates its own accounts on a real mailbox — and avoids
   reintroducing the exact sign-in friction Google sign-up exists to remove.
3. **Is Google's `email_verified` claim trusted?** Decided: yes.
4. **Does the stale-index clutter still get accepted?** Decided: yes, still
   accepted, no cleanup added — now rarer (only the admin-recreation case),
   and a sweep mechanism is more than the residual problem justifies.
5. **Amendment or supersession?** Decided: amend ADR-0033 (not supersede) —
   its Auth.js-level decision (question 1) still stands, narrowed. The
   amendment also carries [task 07](07-google-as-a-sign-up-route.md)'s
   provider-choice reasoning and privacy consequence (its own question 7),
   since this is the ADR specifically about the cost of a second sign-in
   provider, and a corrected revisit trigger that actually fires for a
   Keycloak-brokered provider.
6. **Is there a general lesson about revisit triggers?** Decided: treated as
   a one-off, noted in ADR-0033's amendment text itself rather than promoted
   into [ADR-0019](../../adr/0019-adr-format-and-conventions.md)'s general
   rules — a single instance doesn't yet justify a standing process rule.

Revised 2026-09-08, after [task 07](07-google-as-a-sign-up-route.md) was
dropped. Questions 2 and 3 lose their subject: with no brokered provider there
is no first-broker-login flow to configure and no Google `email_verified` claim
to trust, so nothing is decided there and nothing is left open. Question 5's
amendment narrows to match — it no longer carries task 07's provider-choice
reasoning or its privacy consequence, and the corrected revisit trigger is
about a second Auth.js provider entry for one identity source rather than about
brokering. Questions 1, 4 and 6 stand, and question 1's answer is now
load-bearing rather than merely kind: see `Why`.

## Acceptance criteria

- [ ] ADR-0033 is amended or superseded so that every sentence in it is true of
      the system as it then stands, including its revisit trigger, and
      `node scripts/check-adrs.mjs` passes
- [ ] An account registered through `keycloak-register` and signing in again
      through `keycloak` reaches the same user — covered by an automated test
      that names the decision and was confirmed to fail with
      `allowDangerousEmailAccountLinking` removed
- [ ] A test pins whether `allowDangerousEmailAccountLinking` is set, so a
      later change to it is a deliberate, reviewed edit rather than a silent one
- [ ] Two accounts with the same email cannot end up sharing one cellar,
      demonstrated end to end against the running stack rather than argued
- [ ] `docs/architecture.md` §6's account-linking paragraph matches the
      outcome

## Notes

Found while sketching this iteration on 2026-08-29. The finding is not that
ADR-0033 was wrong — it was right for the system it described — but that
[task 01](01-persist-keycloak-state.md) and
[task 05](05-self-registration-with-email-verification.md) between them
invalidate its context while leaving its own revisit trigger silent.

Rewritten 2026-09-08 when [task 07](07-google-as-a-sign-up-route.md) was
dropped. The original framing hung the second premise on Google being brokered
inside Keycloak. The second provider entry task 05 had already shipped turns
out to be the sharper example, and unlike the Google one it is in the code
today.
