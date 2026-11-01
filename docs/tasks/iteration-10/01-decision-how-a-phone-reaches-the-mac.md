# Task 01: Decide how a real phone reaches the stack on the Mac

- **Status:** needs-refinement
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

## Open questions

1. **Which route?** Tailscale (a stable `*.ts.net` name with a free
   certificate), the Mac's LAN address or mDNS name on the same Wi-Fi, or a
   tunnel. Which networks must it work on — home Wi-Fi only, or also mobile
   data away from home?
2. **HTTPS or a cleartext exception?** HTTPS keeps release builds free of an
   ATS exception and matches what a deployment will look like; cleartext is
   simpler but needs a per-build exception that must never ship.
3. **What does the issuer become?** One public name for every client — the
   browser and simulators included — or a second hostname for the phone
   (Keycloak can serve a different frontend URL per request only in limited
   ways), and what that does to the web BFF's token checks.
4. **What becomes reachable, and by whom?** Binding the edge beyond loopback
   puts Keycloak's admin console, the actuator and the back-channel logout
   endpoint in front of everyone on that network — see
   [task 10](10-the-edge-serves-only-what-a-client-needs.md). Is that
   acceptable on a tailnet only the product owner is on, and not on shared
   Wi-Fi?
5. **Is it opt-in?** A `make` target or `.env` switch that turns phone access
   on, leaving the default stack loopback-only, or always on.
6. **Worktrees:** does each worktree's stack get its own phone-reachable name
   or port, or does only the main checkout serve the phone?

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
