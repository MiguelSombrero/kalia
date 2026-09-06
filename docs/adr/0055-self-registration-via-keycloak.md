# ADR-0055: Self-registration via Keycloak's own registration flow

- **Status:** accepted
- **Date:** 2026-09-06

## Context

Kalia has exactly one account, `testuser`, seeded by
[task 01](../tasks/iteration-6.5/01-persist-keycloak-state.md)'s idempotent
script. [Task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)
asks for the opposite: a visitor with no account creates one with an email
address and a password, proves the address is theirs, and reaches their own
empty cellar signed in — without an operator touching Keycloak.

Keycloak already owns every piece this needs: password hashing, a password
policy, duplicate-email handling, required actions (email verification) and
password reset. [ADR-0025](0025-authjs-valkey-adapter.md) already reversed an
initial recommendation to hand-roll the OIDC client for exactly this reason —
security-sensitive code should not be hand-written where a mature
implementation already exists. The question this ADR settles is which of
Keycloak's own mechanisms Kalia drives, and from where.

The task's constraints name the credential to argue against explicitly: a
`manage-users` service-account token held by the BFF, the most powerful
credential in the system, held by the most exposed component. If a Kalia-owned
form is going to create Keycloak users, that credential — or an equivalent
one — is what it would need.

## Decision

**A visitor creates an account entirely inside Keycloak's own registration
flow.** Kalia's only code is a small `/sign-up` route
(`frontend/app/[locale]/sign-up/`) that shows a one-line acknowledgement
checkbox and, once checked, redirects into
`{issuer}/protocol/openid-connect/registrations` — the same authorization
request `signIn()` already builds for sign-in, pointed at Keycloak's
registration endpoint instead of its login endpoint.

- **A second Auth.js provider (`keycloak-register`), not a hand-built
  redirect.** `frontend/auth.ts` defines it from the same `kalia-frontend`
  client config as the existing `keycloak` provider, differing only in
  `authorization.url`. Auth.js still generates the state, PKCE and nonce for
  this request itself (`@auth/core`'s `authorization-url.js` only skips
  *discovery* when `authorization.url` is set explicitly — it does not skip
  the security-relevant parts), and the token/userinfo/JWKS endpoints are
  still the ones `issuer` discovers, identical to the sign-in provider. No
  OIDC primitive is hand-rolled by this change.
- **The realm, not Kalia, decides whether an account is usable.**
  `registrationAllowed`, `verifyEmail` and `duplicateEmailsAllowed` are set on
  the realm (`keycloak/realm-export.json`), inheriting
  [task 02](../tasks/iteration-6.5/02-parameterise-realm-configuration.md)'s
  one-file-per-environment rule and
  [task 03](../tasks/iteration-6.5/03-prevent-realm-configuration-drift.md)'s
  drift check for free — every field this ADR adds is a plain
  `RealmRepresentation` property `scripts/check-keycloak-realm-config.mjs`
  already knows how to compare, with no change to that script. With
  `verifyEmail` true, Keycloak attaches the `VERIFY_EMAIL` required action to
  a newly registered user and does not complete the authorization-code
  redirect back to Kalia until it is satisfied — an unverified account is
  blocked from the application by construction, not by a check Kalia has to
  remember to make.
- **`registrationEmailAsUsername` stays `false`.** [ADR-0049](0049-profile-module-and-public-identity.md)
  already fixed that `preferred_username` becomes the permanent, public URL
  segment a cellar is addressed by ([ADR-0050](0050-public-cellar-addressing.md));
  using the email as username would permanently publish a registrant's email
  address in every cellar link they ever share.
- **`passwordPolicy: "length(8)"`** — length over composition, matching
  current guidance and a deliberate improvement over today's no-minimum
  default.
- **A basic sign-up rate limit lives on the one path Kalia controls, as one
  counter shared by every visitor, not one per caller.** `/sign-up`'s Server
  Action checks a fixed-window counter in Valkey
  (`features/auth/signUpRateLimit.ts`, `INCR`+`EXPIRE`, 20 attempts per 10
  minutes) before redirecting into Keycloak. It is deliberately not keyed by
  an IP or header: this stack has no reverse proxy in front of Next.js, so
  `x-forwarded-for` is whatever the caller sends, and a limiter keyed on it
  would hand a scripted attacker a fresh identity — and a fresh budget — on
  every request, which is worse than no rate limit at all. A single shared
  counter can't be evaded that way. See Consequences for what it does and
  does not protect.

## Alternatives considered

**A Kalia-native sign-up form driving Keycloak's Admin REST API**
(`POST /admin/realms/kalia/users`), the option the task asks to argue against.
Rejected: it needs a `manage-users`-scoped service-account credential in the
BFF — the single most powerful credential in the system (create or modify any
user, in any realm this client can reach), held by the component with the
largest attack surface. It also re-implements, in Kalia's own code, several
things Keycloak already does correctly and keeps maintaining: password
hashing and policy enforcement, the duplicate-email check, and the
email-verification required-action lifecycle. Building a Kalia-styled
registration form was the entire reason to consider this route, and
[task 06](../tasks/iteration-6.5/06-kalia-branded-bilingual-auth-pages.md)
gets that outcome by theming Keycloak's own pages instead, without the
credential.

**Delegating account creation entirely to an external provider** (Google) —
[task 07](../tasks/iteration-6.5/07-google-as-a-sign-up-route.md)'s subject,
not this one. It does not exist independent of Google being reachable and
acceptable to a given visitor, so it is a second route this task's own
non-goals defer, not a replacement for a Kalia-controlled email/password path.

## Consequences

- Good, because no new credential exists anywhere in this system —
  registration is exactly as privileged as Keycloak's admin console already
  was, and Kalia's `/sign-up` route holds no secret an attacker would want.
- Good, because password hashing, the password policy, duplicate-email
  handling and the verify-before-usable ordering are Keycloak's own,
  well-exercised code, not this task's to get right and keep right.
- Bad, because registering an already-used email says so explicitly
  ("this email is already registered") — Keycloak's native duplicate-email
  behaviour, kept deliberately (task refinement, question 5) rather than
  hidden behind a generic "check your email" message. This is a real
  enumeration trade-off: a stranger can confirm a given address has a Kalia
  account. Accepted in exchange for not stranding a real person who mistyped
  their own email with no explanation at all, on an app with no accounts
  worth targeting yet (see the task's own Notes on deployment).
- Neutral, because the sign-up rate limit only covers `/sign-up`, the one
  entry point Kalia advertises. A script that skips it and posts straight to
  `{issuer}/protocol/openid-connect/registrations` is not rate-limited by
  Kalia at all — Keycloak's registration endpoint has no visitor-facing
  throttle of its own in this realm. Acceptable for now because nothing is
  deployed (no real address book to exhaust, no public URL to scan for), and
  cheap to have in place before that changes.
- Neutral, because the counter being shared rather than per-visitor means one
  abusive run (or one flaky, retried Playwright spec) spends everyone's
  budget for the next ten minutes, not just its own. Accepted because the
  thing being protected — Gmail's free-tier send quota (task 04) — is itself
  one shared, global budget; a per-visitor limit would protect against the
  wrong shape of exhaustion while being trivially bypassable (see above).
- Neutral, because the registration form's username field still accepts
  characters this task decided against (`@`, whitespace) — enforcing "URL-safe
  characters only" needs a declarative user-profile change
  (`realm.attributes.userProfileConfig`, a full replacement of Keycloak's
  user-profile schema, not a merge) that was not built this session: getting
  it wrong risks disabling registration entirely, worse than leaving the
  constraint unenforced, and this session had no live Keycloak to verify the
  correct schema against. Left as an explicit gap for the PR reviewer rather
  than a guessed config; profile creation (which reads `preferred_username`)
  is unaffected either way since Kalia does not yet validate it itself.
- **Revisit trigger:** if `/sign-up` ever needs to defend a public deployment
  rather than a local stack, both open gaps above (the endpoint bypass, the
  unenforced username charset) need a real answer — either a Keycloak
  user-profile change verified against a running realm, or (for the rate
  limit) something in front of Keycloak itself.
