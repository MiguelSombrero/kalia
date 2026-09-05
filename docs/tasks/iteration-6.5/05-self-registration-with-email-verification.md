# Task 05: Self-registration with email verification

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-3

## Why

Kalia has exactly one account, `testuser`, written into
`keycloak/realm-export.json` by hand. There is no way for anyone else to have
one. Every feature built since [iteration 4](../iteration-4.md) — the cellar,
and the profile and public cellars [iteration 6](../iteration-6.md) is about —
is per-user, and all of it has been exercised by a single fixture user
pretending to be a population.

The social half of the vision cannot be demonstrated at all with one account: a
public cellar needs a stranger to browse it, and a feed needs more than one
person putting bottles in.

This is the task that decides *how* someone becomes a Kalia user, and the
alternatives are real enough that the decision has to be written down rather
than inferred from the configuration it leaves behind.

## Scope

A visitor with no account can create one with an email address and a password,
prove the address is theirs, and end up signed in — without an operator
touching Keycloak.

The decision behind it is recorded as an ADR: which of the credible approaches
was chosen, and why the others were not. At minimum the alternatives are
Keycloak's own registration flow, a Kalia-native form driving Keycloak's admin
API, and delegating account creation entirely to an external provider
([task 07](07-google-as-a-sign-up-route.md)).

## Non-goals

- Signing up with Google — [task 07](07-google-as-a-sign-up-route.md), a
  separate route and a separate decision.
- Making those pages look like Kalia, or speak Finnish —
  [task 06](06-kalia-branded-bilingual-auth-pages.md).
- The mail path itself — [task 04](04-send-email-from-kalia.md).
- Profile creation. A Kalia profile for a new user is
  [iteration 6 task 01](../iteration-6/01-profile-and-visibility.md)'s
  subject, and this task must not quietly answer it.
- Account deletion and data export. Real users make these real, and they are
  still [backlog](../backlog.md) — see Notes.
- Bot protection. Nothing is deployed, so there are no bots yet; whether
  Keycloak's reCAPTCHA integration is wanted later is a question this task
  raises rather than answers.

## Constraints

- **The security-sensitive code should not be hand-written.**
  [ADR-0025](../../adr/0025-authjs-valkey-adapter.md) settled this shape of
  argument once already, reversing an initial recommendation to hand-roll the
  OIDC client. Password hashing, password policy, duplicate handling, required
  actions and reset are all things Keycloak already does.
- **A `manage-users` service-account credential in the BFF is the option to
  argue against explicitly.** It is the most powerful credential in the system
  — create or modify any user — held by the most exposed component. If the ADR
  chooses that route it has to say why the trade is worth it.
- The Keycloak `sub` stays the canonical user identifier
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)). Nothing
  here changes the backend.
- **The username a new account gets is Kalia's permanent public identity for
  that person** ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md),
  decided during iteration 6's refinement on 2026-08-30 — the caveat
  [this iteration's index](../iteration-6.5.md) records). `preferred_username`
  is copied once into the profile and never changes, and it is the URL segment
  a public cellar is addressed by. So the sign-up form's question 2 is not
  free: whatever it collects has to be something a stranger can reasonably see
  and a person can live with permanently.
- Registration settings are realm configuration, so they inherit
  [task 03](03-prevent-realm-configuration-drift.md)'s answer, and any
  environment-varying value inherits
  [task 02](02-parameterise-realm-configuration.md)'s.
- Requires a working mail path ([task 04](04-send-email-from-kalia.md)) and a
  Keycloak whose accounts survive a restart
  ([task 01](01-persist-keycloak-state.md)).
- Whatever the sign-up form asks for is wording a user reads, and is the
  product owner's to approve.
- ADR shape follows [the template](../../adr/template.md) and
  [ADR-0019](../../adr/0019-adr-format-and-conventions.md). Decided during
  refinement: this task's registration-approach decision gets its own ADR,
  separate from [task 03](03-prevent-realm-configuration-drift.md)'s
  keycloak-config-cli ADR — the two are independently reversible
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test: which
  registration mechanism Kalia uses could change without touching how realm
  configuration is deployed, and vice versa).

## Open questions

**None.**

Resolved during refinement (2026-09-05):

1. **Which approach?** Decided: **Keycloak's own registration flow**, per the
   analysis's recommendation. Recorded in a new ADR (numbered via
   `make next-adr` at implementation time) — a credible rejected alternative
   (the Kalia-native admin-API form) whose reasoning a later reader would need
   independent of this task file, per
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md).
2. **What does the form ask for?** Decided: **email, password, and a separate
   public username — never the email address, and never derived from it.**
   [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) already
   fixed that Keycloak's `preferred_username` becomes the permanent,
   immutable URL segment for a public cellar
   ([ADR-0050](../../adr/0050-public-cellar-addressing.md)); using the email
   as the username (Keycloak's `registrationEmailAsUsername`) would
   permanently leak a registrant's email address into every public cellar
   link they ever share, which conflicts with ADR-0049's own privacy framing.
   `registrationEmailAsUsername` stays `false`; the username field is
   constrained to URL-safe characters (letters, digits, `-`, `_`; no `@` or
   spaces). This is the answer [iteration 6 task
   01](../iteration-6/01-profile-and-visibility.md)'s question 3 needed —
   that task is already `done` and already took the identifier decision from
   the other side (ADR-0049), so this task's form simply has to collect
   something Keycloak can issue as `preferred_username`, which it now does.
3. **Verify before or after setting a password?** Decided: verify first —
   Keycloak 26's flow where an unverified account never holds a working
   credential.
4. **What may an unverified user do?** Decided: nothing — blocked from the
   application entirely until verified.
5. **What does a user see when the email is already registered?** Decided:
   say so explicitly ("this email is already registered"). Accepts the
   enumeration trade-off (confirming to a stranger that an address has a
   Kalia account) in exchange for not stranding a real person with no
   explanation; record this as a Consequence in the new ADR from question 1.
6. **Password policy?** Decided: minimum length only, **8 characters**. No
   composition rules (upper/lower/digit/symbol) — matches current
   length-over-composition guidance and is a deliberate improvement over
   today's no-minimum-at-all default.
7. **Is there anything to agree to?** Decided: yes, a minimal acknowledgement
   checkbox (e.g. "I'm old enough to use a beer app") — no full terms of
   service or privacy policy. Exact copy is the product owner's to approve on
   the PR, not fixed here.
8. **Does sign-up need its own Kalia page?** Decided: yes, a small dedicated
   `/sign-up` route that redirects into Keycloak's registration endpoint.

## Acceptance criteria

- [ ] A visitor with no account completes sign-up in a browser and reaches
      their own empty cellar signed in, without any operator action
- [ ] A Playwright spec covers register → verify → sign in → sign out → sign in
      again, reading the verification link from the local mail catcher, and was
      confirmed to fail against the unfixed build
- [ ] The account created that way survives a stack restart and signs in again
      — the guarantee [task 01](01-persist-keycloak-state.md) exists for,
      demonstrated by the feature that needs it
- [ ] An automated test pins that an unverified account cannot reach whatever
      question 4 decides it cannot reach
- [ ] Registering an address that already exists behaves the way question 5
      decided, covered by a test that names the decision
- [ ] An ADR records the decision, the rejected alternatives and at least one
      Bad or Neutral consequence; `node scripts/check-adrs.mjs` passes
- [ ] `docs/architecture.md` §6 describes registration, and the ADR is in its
      §9 index and [docs/adr/README.md](../../adr/README.md)

## Notes

From the sign-up options analysis of 2026-08-29. Two findings from it that
belong on the record rather than in an open question:

**Suomi.fi is not available to this project.** Private operators have no right
to use Suomi.fi-tunnistus except when performing a public administration task;
it is free only for public-administration bodies and their owned companies, and
taking it into use requires a käyttölupa application to DVV. The commercial
route to the same bank credentials is a paid contract with a
Traficom-registered broker. It would also be the wrong instrument: strong
identification yields henkilötunnus-grade identity, which for a beer-cellar
hobby app that sells nothing is a data-minimisation failure rather than a
quality bar.

**Account deletion and data export stop being theoretical here.** The
[backlog](../backlog.md)'s GDPR entry says it "becomes real the moment anyone
but the author uses this" — this is that moment. Deliberately not a task in
this iteration, because nothing is deployed and no real person can register
yet; it should be raised the moment a deployment is planned, and it is a
reason not to deploy this iteration's work casually.
