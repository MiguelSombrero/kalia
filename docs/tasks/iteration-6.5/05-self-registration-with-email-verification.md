# Task 05: Self-registration with email verification

- **Status:** needs-refinement
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
  [ADR-0019](../../adr/0019-adr-format-and-conventions.md); whether it is one
  ADR or shares one with [task 03](03-prevent-realm-configuration-drift.md) is
  that task's question 2.

## Open questions

1. **Which approach?** The analysis of 2026-08-29 recommended Keycloak's own
   registration flow, with a Kalia-native admin-API form judged the worst of
   both — consistent UI bought with reimplemented security code, a
   `manage-users` credential in the frontend, and a hybrid UI anyway because
   password reset stays on Keycloak's pages. The product owner decides; the ADR
   records it either way.
2. **What does the form ask for?** Email and password is the minimum. A display
   name here would answer
   [iteration 6 task 01](../iteration-6/01-profile-and-visibility.md)'s open
   question 3 — and answering it by accident, in a different iteration, is
   exactly the drift this process exists to prevent. These two want deciding
   together.
3. **Verify the address before or after setting a password?** Keycloak 26 can
   do verification first, so an unverified account never holds a credential.
   It is the safer order and the less familiar flow.
4. **What may an unverified user do?** Nothing, or browse but not own a cellar.
   The answer decides whether "verified" is a gate the application knows about
   or purely Keycloak's business.
5. **What does a user see when the email is already registered?** Saying so
   confirms to a stranger that an address has a Kalia account; not saying so
   leaves a real person stuck with no idea why. A deliberate choice either way.
6. **Password policy?** Keycloak enforces whatever it is told. Nothing is set
   today, which means no minimum length.
7. **Is there anything to agree to?** No terms, no privacy policy and no age
   statement exist. A beer platform with no age acknowledgement at all is a
   choice worth making on purpose — noting that Kalia does not sell beer, so
   this is a product decision rather than a legal duty, and that strong
   identification would be disproportionate (see Notes).
8. **Does sign-up need its own Kalia page at all,** or does the existing Sign
   in button plus Keycloak's own "Register" link suffice? A `/sign-up` route
   that redirects into Keycloak's registration endpoint is a small thing that
   makes the option discoverable.

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
