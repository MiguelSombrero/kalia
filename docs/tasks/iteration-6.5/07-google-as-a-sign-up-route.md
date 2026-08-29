# Task 07: Google as a second sign-up route

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-4

## Why

[Task 05](05-self-registration-with-email-verification.md) gives Kalia a door
anyone with an email address can walk through, and it costs the user a new
password, a verification email and a wait.

Most people signing up for a small social app expect to press one button.
Adding Google as an identity provider Keycloak brokers to makes first sign-in
*be* sign-up: no password stored, no verification mail, no reset flow, and the
email arrives already verified by someone whose job is verifying it.

It is also free in the sense this project requires. Google's `openid`, `email`
and `profile` scopes are non-sensitive: no verification review, no payment, no
contract, and `localhost` redirect URIs are permitted for development. (Apple
is excluded — it needs a paid developer programme. Facebook needs business
verification.)

This runs after [task 05](05-self-registration-with-email-verification.md), not
instead of it, so that no third party the project has no agreement with is the
only way to have a Kalia account.

## Scope

A visitor can create a Kalia account with Google and sign in with it
afterwards, brokered by Keycloak so the rest of the system continues to see one
identity provider.

## Non-goals

- GitHub, or any further provider. The mechanism generalises; the decision to
  add another one is separate, and each provider is one more consent screen to
  keep working.
- Replacing password sign-up.
- Linking an existing password account to Google from within the app.
  Whether Keycloak's own first-broker-login flow links or duplicates is
  [task 08](08-revisit-account-linking.md); a Kalia-side account-linking UI is
  neither task.

## Constraints

- **Keycloak brokers it; Auth.js must not.**
  [ADR-0025](../../adr/0025-authjs-valkey-adapter.md) and
  [ADR-0028](../../adr/0028-resource-server-and-current-user.md) both rest on
  Keycloak being the single identity source, and
  [ADR-0033](../../adr/0033-keycloak-account-relinking.md)'s
  `allowDangerousEmailAccountLinking` is safe *only* because Auth.js sees one
  provider. Registering Google in `frontend/auth.ts` instead of in Keycloak
  would silently invalidate that ADR's premise.
- **The email-collision risk reappears one layer down.** With brokering,
  ADR-0033's stated revisit trigger ("a second sign-in provider is added") does
  not fire — Auth.js still sees only Keycloak — but the identical decision now
  has to be made inside Keycloak's first-broker-login flow.
  [Task 08](08-revisit-account-linking.md) owns it, and this task must not
  settle it by accepting a default.
- The Keycloak `sub` remains the canonical user id (ADR-0028). A brokered user
  is a Keycloak user, so nothing changes for the backend.
- Client id and secret come from the environment, never committed
  ([ADR-0015](../../adr/0015-configuration-strategy.md),
  [task 02](02-parameterise-realm-configuration.md)).
- Identity-provider configuration is realm configuration
  ([task 03](03-prevent-realm-configuration-drift.md)).
- Registering an OAuth client with Google is an account and a set of terms.
  Confirm with the product owner before creating anything under their name.

## Open questions

1. **Google, or GitHub, or both?** GitHub is the easier registration and the
   wrong audience for a beer app; Google is the broad one and the more
   involved consent screen. Both means two providers and the collision question
   in question 4 becomes live rather than theoretical.
2. **Whose Google Cloud project owns the OAuth client,** and what happens to
   Kalia if that account goes away? A free dependency with no contract still
   has an owner.
3. **Is the "unverified app" consent screen acceptable?** Basic scopes need no
   review, but the screen warns the user until the lighter branding
   verification is done — and that needs a privacy policy and a domain, neither
   of which exists.
4. **What if a Google account presents an email that already has a Kalia
   password account?** Link, refuse, or create a duplicate — the substance of
   [task 08](08-revisit-account-linking.md), flagged here because this task is
   what makes it reachable.
5. **What does the button say, and where does it sit** relative to the password
   form? User-visible wording, and it lives on a Keycloak page
   ([task 06](06-kalia-branded-bilingual-auth-pages.md)).
6. **How is this tested without hitting Google?** A Playwright spec cannot
   drive a real Google consent screen. A second Keycloak realm acting as a
   stand-in OIDC provider is the usual answer and is more moving parts than it
   sounds.
7. **Does the privacy consequence need recording?** Every sign-in tells Google
   the user opened a beer platform. Small, real, and the kind of thing
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) says belongs in
   the consequences of a decision rather than nowhere.

## Acceptance criteria

- [ ] A visitor with no Kalia account signs up with Google in a browser and
      reaches their own empty cellar, with no password ever set
- [ ] Signing out and back in with Google returns the same account — same
      Keycloak `sub`, same cellar — verified against the backend's view, not
      just the UI
- [ ] An automated test covers the brokered sign-in end to end without calling
      Google, by whatever stand-in question 6 settles on
- [ ] `frontend/auth.ts` still registers exactly one provider, pinned by a
      test, so ADR-0033's premise cannot be broken silently later
- [ ] `git grep` finds no Google client secret in the repository
- [ ] `docs/architecture.md` §6 records that Keycloak brokers an external
      provider, and ADR-0033's status reflects
      [task 08](08-revisit-account-linking.md)'s outcome

## Notes

Option C in the sign-up options analysis of 2026-08-29, recommended as a fast
follow to password registration rather than as the base — the asymmetry being
that a mail-provider outage delays new sign-ups while a broker outage locks
out every existing user of that broker.
