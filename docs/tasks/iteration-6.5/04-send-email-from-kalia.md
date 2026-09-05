# Task 04: Give Kalia a way to send email

- **Status:** done
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
sending path configured from the environment rather than committed — built to
work, not proven to work against the real provider, see open question 3 — and
the sender identity a recipient sees.

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
  constraint on this iteration. **Decided during refinement (2026-09-05): the
  product owner's own Gmail account via SMTP (`smtp.gmail.com`, an App
  Password credential), rather than a third-party transactional-mail
  provider.** Verified rather than assumed: a personal Gmail account may send
  500 messages per rolling 24-hour window (2,000 for Google Workspace) over
  SMTP with an App Password (required once 2-Step Verification is on, since
  Google removed plain-password SMTP access in 2025) — a higher daily cap than
  Brevo's 300/day candidate, no signup with a new third party, and
  infrastructure the product owner already controls. The trade-off worth
  recording: Gmail SMTP is meant for personal correspondence rather than
  transactional mail, deliverability for app-sent mail is not specially
  optimised the way a dedicated provider's is, and — same shape of concern as
  [task 07](07-google-as-a-sign-up-route.md)'s Google Cloud OAuth client —
  the sending identity is tied to one person's personal Google account rather
  than a project-owned one.
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

**None.**

Resolved during refinement (2026-09-05):

1. **Which provider?** Decided: Gmail SMTP via the product owner's own
   account — see Constraints above. Password registration
   ([task 05](05-self-registration-with-email-verification.md)) is still the
   base route (per this iteration's index, Google is a fast-follow, not a
   replacement), so this task is needed regardless of task 07.
2. **What catches mail locally?** Decided: **Mailpit** (new dependency,
   `axllent/mailpit` Docker image — exact tag confirmed at implementation
   time). Preferred over MailHog, which is effectively unmaintained upstream;
   Mailpit exposes an HTTP API a Playwright spec can query directly to read a
   verification link out of a caught message.
3. **Does the real provider get exercised before a deployment exists?**
   Decided: **no.** Local dev and test always run against Mailpit, which needs
   no SMTP auth, and every acceptance criterion below is satisfiable that way
   — none require a live connection to `smtp.gmail.com`. Reversed within the
   same refinement conversation after the product owner raised a hard
   requirement: no AI agent implementing this task may have any means of
   reading the real App Password, not merely an instruction not to type it in
   — an agent with filesystem/shell access on the machine can in principle
   read any file it is pointed at or dump a resolved environment variable, so
   the credential's existence has to be kept out of any session an agent has
   tool access to, not just out of the code it writes. Exercising the real
   provider now, with no domain and no deployment to receive replies or
   bounces, was also already adjacent to this task's domain/DNS and
   deliverability-engineering non-goals above — it belongs to the deployment
   that does not exist, same as they do. Consequence: this task configures the
   Gmail SMTP sending path but does not prove it against the real provider;
   that proof — and the first point at which the real App Password has to
   exist on any machine — becomes a future deployment task's problem. See the
   Notes below.
4. **Sender address and name?** Decided: the product owner's Gmail address as
   the underlying sender, with **"Kalia" as the display name** (e.g.
   `Kalia <the-gmail-address>`), so the mail reads as the product rather than
   a personal account despite the underlying address.
5. **What happens when sending fails?** Decided: the registration fails
   visibly and the user is asked to retry — no account is left in an
   unverifiable limbo state with no signal that verification never went out.
6. **Is a rate limit needed?** Decided: yes, add a basic rate limit on the
   registration/verification-email path now, given Gmail's 500/day cap is a
   real, exhaustible budget even before any deployment or real traffic exists.

## Acceptance criteria

- [x] Triggering a Keycloak email in the local stack produces a message a
      developer can read without a real mailbox, verified by doing it
- [x] The verification link in that message resolves against the configured
      frontend origin, not a container-internal hostname — the same
      two-address trap [ADR-0025](../../adr/0025-authjs-valkey-adapter.md)
      records three failures for
- [x] A Playwright spec reads a real message out of the local catcher and
      follows its link, so the mail path is covered by an automated test
      rather than a manual click
- [x] `git grep` finds no SMTP credential in the repository
- [x] The chosen provider and its free-tier limits are recorded in the tech
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

Whichever future task first deploys Kalia and turns on the real Gmail SMTP
path inherits the question open question 3 deliberately leaves unanswered:
how the real App Password gets created and put in place without any AI agent
implementing that task having the means to read it. Re-raise this explicitly
during that task's own refinement — don't assume the env-var-only pattern
[task 02](02-parameterise-realm-configuration.md) already established for the
Keycloak client secret is sufficient on its own, since it was judged
insufficient for exactly this credential in this task's refinement.
