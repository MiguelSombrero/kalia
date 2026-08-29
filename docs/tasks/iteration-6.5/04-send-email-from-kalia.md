# Task 04: Give Kalia a way to send email

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-3

## Why

Self-registration with a password is not production-grade without email.
Without a verified address there is no proof the address is real, no password
reset, and nothing stopping someone registering under an address that belongs
to another person. So the mail path is not a polish item on
[task 05](05-self-registration-with-email-verification.md) — it is its
precondition, and it is the only part of sign-up that introduces an outside
service.

Kalia sends no email today and has no SMTP configuration anywhere.

## Scope

Keycloak can send mail in the local stack and, in principle, from a deployment:
a place for a developer to read what was sent without a real mailbox, a real
sending path configured from the environment rather than committed, and the
sender identity a recipient sees.

## Non-goals

- Any email Kalia's own backend or frontend sends. Everything in this iteration
  is Keycloak's — verification and password reset. Application email (a feed
  digest, a follower notification) has no sender and no consumer yet.
- Choosing a domain, or DNS records for one. Both belong to the deployment that
  does not exist.
- Deliverability engineering — SPF, DKIM, DMARC, warm-up. Named in the
  constraints so the eventual answer is not surprised by it.

## Constraints

- **Free tier, no contract, no paid plan** — the product owner's standing
  constraint on this iteration. As of 2026-08-29 that admits Brevo (300/day),
  Resend (3 000/month) and Mailtrap (4 000/month); Mailgun's free tier is
  100/day, SendGrid no longer has one, and Amazon SES requires an AWS account
  with a card. Confirm current terms at refinement rather than trusting this
  list.
- **Self-hosting an SMTP server is not an option to weigh seriously.** Cloud
  and residential IP ranges are blocked by default at most receivers, and
  deliverability needs a domain, aligned SPF/DKIM/DMARC and reputation built
  over time. It is free and it does not work.
- A provider is a new dependency: ask for the choice, do not research and pick
  ([CLAUDE.md](../../../CLAUDE.md)).
- Credentials come from the environment and are never committed —
  [ADR-0015](../../adr/0015-configuration-strategy.md), and the same rule
  [task 02](02-parameterise-realm-configuration.md) applies to the realm file
  that would hold them.
- Mail configuration is realm configuration, so it inherits
  [task 03](03-prevent-realm-configuration-drift.md)'s answer.

## Open questions

1. **Which provider?** A version-and-vendor choice for the product owner, not
   an agent. Worth deciding alongside whether it is needed at all: if
   [task 07](07-google-as-a-sign-up-route.md)'s route were the *only* one,
   this task disappears entirely.
2. **What catches mail locally?** A container such as Mailpit or MailHog keeps
   development offline and lets a Playwright spec read the verification link
   out of an API — which is probably the only practical way to test the
   registration flow end to end. It is a new Docker image and needs a version.
3. **Does the real provider get exercised anywhere before a deployment
   exists?** A path configured and never run is a path that does not work.
4. **What address does mail come from, and what does the sender name say?**
   Both are user-visible wording, and a free tier usually forces a
   provider-owned sending domain until a real one is verified.
5. **What happens when sending fails?** Keycloak's own behaviour on SMTP
   failure during registration decides whether a user is left with an account
   they cannot verify, and that is a support burden with no support channel.
6. **Is a rate limit needed?** A verification endpoint that will send mail to
   any address supplied is an abuse vector, and a free tier's daily cap is a
   denial-of-service budget someone else can spend.

## Acceptance criteria

- [ ] Triggering a Keycloak email in the local stack produces a message a
      developer can read without a real mailbox, verified by doing it
- [ ] The verification link in that message resolves against the configured
      frontend origin, not a container-internal hostname — the same
      two-address trap [ADR-0025](../../adr/0025-authjs-valkey-adapter.md)
      records three failures for
- [ ] A Playwright spec reads a real message out of the local catcher and
      follows its link, so the mail path is covered by an automated test
      rather than a manual click
- [ ] `git grep` finds no SMTP credential in the repository
- [ ] The chosen provider and its free-tier limits are recorded in the tech
      stack section of the relevant README, per
      [CLAUDE.md](../../../CLAUDE.md)'s dependency rule

## Notes

Raised by the sign-up options analysis on 2026-08-29, which noted that
declining third-party OAuth on principle while accepting a third-party email
provider is not a coherent line: both are free-tier accounts with no contract,
and the mail provider sees more (every address, every message body) than an
OIDC provider does at sign-in. The defensible distinction is failure mode — a
mail outage delays new sign-ups, a broker outage locks out existing users —
and that is an argument about which route is the *base*, not about which
dependency is acceptable.
