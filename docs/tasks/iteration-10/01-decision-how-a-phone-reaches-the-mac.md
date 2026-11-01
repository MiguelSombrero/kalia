# Task 01: Decide how a real phone reaches the stack on the Mac

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** DW-5

## Why

Everything in iteration 9 reaches the stack through the Mac's own loopback:
the iOS Simulator shares it, the Android emulator gets it with `adb reverse`,
and Keycloak's issuer is pinned to `http://localhost:${KEYCLOAK_PORT}`
(`docker-compose.base.yml`), which the backend and the web app both validate.
A physical iPhone has none of that. Its `localhost` is itself, so it can reach
neither the API nor Keycloak, and even if it reached Keycloak under another
name, the tokens it got would carry an issuer the backend refuses.

There are several credible ways across — a tailnet name, the Mac's address on
the same Wi-Fi, a tunnel — and each one decides what the issuer becomes,
whether the traffic is HTTPS, and what is exposed to whom. Getting this wrong
fails silently: a mismatched issuer presents as a broken sign-in rather than
a configuration error. The choice has to be made, and its reasons recorded,
before [task 02](02-the-phone-reaches-the-stack.md) builds it.

## Scope

An ADR records how a physical phone reaches the API and Keycloak on the
developer's Mac, what Keycloak's issuer is under it, and how the same stack
keeps serving the browser and both simulators on `localhost`.

## Non-goals

- Implementing it — [task 02](02-the-phone-reaches-the-stack.md).
- A hosted backend anyone else can reach: parked for cost in
  [the backlog](../backlog.md#mobile-client).

## Constraints

- **No cost** (`CLAUDE.md`): any option needing a paid plan, a card on file or
  a domain is out. A free tier is acceptable only if it needs no card.
- The issuer Keycloak stamps and the issuer every consumer validates must be
  one value, built in one place
  ([`docker-compose.base.yml`](../../../docker-compose.base.yml)'s comment
  explains why); [ADR-0028](../../adr/0028-resource-server-and-current-user.md)
  checks `iss`.
- [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
  names "a deployment that changes the issuer or the redirect URIs" as a
  trigger to revisit it; the app calls Spring through the edge, and redirect
  URIs are an exact list.
- [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md):
  the edge is the one way in; the services trust the client address it names.
- [ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md):
  a dev default lives in `docker-compose.dev.env`, never as `:-` in the base.
- Each worktree runs its own stack on its own ports (`make stack-env`); the
  answer must not assume the default ports.
- A release iOS build refuses plain HTTP unless the app declares an exception
  (App Transport Security); Android's release build refuses it too, which is
  why `plugins/withE2eCleartext.js` exists.
- A new tool or service is a new dependency — asked, not researched.

**Decided at refinement, 2026-11-01** (product owner):

- **The route is Tailscale.** The Mac and the phone join the product owner's
  own tailnet on Tailscale's free personal plan, which asks for no card, and
  `tailscale serve` forwards the tailnet to the edge, which stays bound to
  loopback. Only the owner's own devices reach the stack, on home Wi-Fi or on
  mobile data. The ADR records the two rejected routes and their costs: the
  Mac's LAN address (one network only, an address that moves, and the edge
  bound beyond loopback for everyone on that Wi-Fi) and a public tunnel (the
  stack on the internet, and a free URL that changes the issuer every run).
- **Plain HTTP for now, HTTPS on a recorded trigger.** WireGuard already
  encrypts tailnet traffic, and with no certificate requested nothing is
  published: a tailnet certificate would put the machine's name and the
  tailnet's name into the public Certificate Transparency logs. The ADR names
  the trigger for HTTPS — the first rehearsal of a real deployment, or the
  first feature that needs it — and the switch as a configuration change, a
  rebuild of the app and a fresh sign-in, after renaming the machine to a
  neutral name.
- **Phone mode is opt-in.** The default stack is unchanged and loopback-only on
  `localhost`; CI and the worktrees never need Tailscale.
- **One issuer per mode, built from one value.** In phone mode one origin in
  the root `.env` — the tailnet name — becomes the issuer Keycloak stamps, the
  issuer the backend and the web validate, the web's public URL and the app's
  origins. No request-derived hostname and no second accepted issuer. The ADR
  states which clients work in each mode, the Android emulator included.
- **Exposure:** in phone mode the tailnet's members reach the edge's three
  published ports, and nothing listens beyond loopback.
  [Task 10](10-the-edge-serves-only-what-a-client-needs.md) closes the admin,
  metrics and back-channel routes whatever the mode; with a tailnet of the
  owner's devices only it is not a prerequisite of phone mode, but it runs
  first in the iteration's order.
- **Worktrees:** phone mode forwards the stack's own ports, so whichever one
  worktree is in phone mode serves the phone, and nothing assumes the default
  ports.
- **A release build in phone mode needs a cleartext exception scoped to the
  tailnet host,** and no other build may carry one —
  [task 05](05-build-variants.md) owns the check.
- **The tailnet's name and the machine's name are host details:** the root
  `.env` only, never a commit, PR or comment.
- Tailscale's version is proposed at implementation and confirmed in the PR
  ([iteration index](../iteration-10.md#refinement)).

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records the route, the issuer, what is exposed on which network,
      the rejected alternatives and their costs, and passes
      `node scripts/check-adrs.mjs`
- [ ] ADR-0095 is amended where the decision changes what it states about the
      issuer or the redirect URIs
- [ ] Each test the decision implies — the issuer every consumer validates
      matching the one Keycloak stamps under the new name, the default stack
      still serving `localhost` — is named in the acceptance criteria of
      [task 02](02-the-phone-reaches-the-stack.md) before it is refined

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks; iteration 9's
closing note on how each simulator reaches the Mac. A decision task, so it adds
no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
