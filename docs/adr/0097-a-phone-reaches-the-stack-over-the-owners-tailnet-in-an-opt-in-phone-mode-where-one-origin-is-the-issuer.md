# ADR-0097: A phone reaches the stack over the owner's tailnet in an opt-in phone mode, where one origin is the issuer

- **Status:** accepted
- **Date:** 2026-11-01

## Context

Everything [iteration 9](../tasks/iteration-9.md) built reaches the stack
through the Mac's own loopback. The iOS Simulator shares it, the Android
emulator gets it with `adb reverse`, the browser is on it, and the edge publishes
its three ports on `127.0.0.1` only
([ADR-0090](0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
Keycloak's issuer is pinned to `http://localhost:${KEYCLOAK_PORT}` and the
backend and the web app both validate it
([ADR-0028](0028-resource-server-and-current-user.md) checks `iss`).

A physical iPhone has none of that. Its `localhost` is itself, so it reaches
neither the API nor Keycloak; and if it reached Keycloak under another name, the
tokens it got would carry an issuer the backend refuses. Keycloak stamps the
issuer from its configured hostname, not from the request
(`docker-compose.base.yml` records the inconsistency a request-derived name
produced), so the name the phone uses to reach Keycloak has to *be* the issuer,
for everyone who validates it. A mismatch fails silently: it presents as a
broken sign-in, not as a configuration error.

[Iteration 10](../tasks/iteration-10.md)'s goal is Kalia running on the product
owner's own iPhone against the stack on their Mac, at no cost
(`CLAUDE.md`: no paid account, no card on file). This ADR chooses the route
before [task 02](../tasks/iteration-10/02-the-phone-reaches-the-stack.md) builds
it. [ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
named a deployment that changes the issuer as the trigger to revisit what it says
about the issuer and the redirect URIs; this is that deployment.

## Decision

**A physical phone reaches the stack on the Mac over the product owner's own
Tailscale tailnet, in an opt-in phone mode in which one origin — the tailnet
name of the Mac — is the issuer Keycloak stamps, the issuer the backend and the
web app validate, the web app's public URL and the origin the app dials;
the traffic is plain HTTP inside the tunnel until a recorded trigger moves it
to HTTPS.**

- **The route is Tailscale.** The Mac and the phone join the owner's tailnet on
  Tailscale's free personal plan, which asks for no card, and `tailscale serve`
  forwards the tailnet name's ports to the edge's published ports on
  `127.0.0.1`. The edge stays bound to loopback; the forwarder, not the stack,
  is what listens on the tailnet. The phone reaches the Mac on home Wi-Fi or on
  mobile data, and no other device does. Tailscale is a new dependency: its
  version is proposed at implementation and confirmed in the pull request
  ([iteration 10](../tasks/iteration-10.md#refinement)).
- **Phone mode is opt-in; the default stack is unchanged.** With it off, the
  stack is loopback-only and every address is `localhost:<port>`, exactly as
  today; CI and every worktree run that way and never need Tailscale. How a
  developer turns phone mode on, and the name of the variable that holds the
  value below, are task 02's.
- **One value per mode, built in one place.** In phone mode a single value in the
  root `.env`, the tailnet host name, is joined to each service's own port (the
  stack's, so a worktree's, never an assumed default) to build every address
  that names it: Keycloak's hostname and so its issuer
  `http://<tailnet-host>:<KEYCLOAK_PORT>/realms/kalia`; the backend's and the
  web app's configured issuer; the web app's public URL, which the realm's
  `rootUrl` and `baseUrl` for both clients and `kalia-web`'s redirect URIs and
  web origins are built from
  ([ADR-0054](0054-keycloak-config-cli-realm-management.md)); and the app's API
  and Keycloak origins. **No hostname is request-derived and no second issuer is
  accepted:** a stack validates exactly one issuer, in either mode.
- **Which client works in which mode follows from that, and is stated rather
  than hoped for.**

  | Client | Phone mode off | Phone mode on |
  |---|---|---|
  | Browser on the Mac | `localhost` | the tailnet origin |
  | iPhone | cannot reach the stack | the tailnet origin |
  | iOS Simulator | `localhost` | the tailnet origin, from a build made for phone mode — expected to work because it shares the Mac's network, and checked by task 02 |
  | Android emulator | `localhost` through `adb reverse` | **not supported**: `adb reverse` forwards `localhost` only, and the issuer is no longer that name |
  | CI, Playwright, Maestro | `localhost` | not run |

  Switching is a change to the root `.env` and a recreate of the services that
  carry the value, not a second stack running beside the first.
- **The redirect URIs do not change.** The app's callback, `kalia://auth/callback`,
  names a scheme and no host, so `kalia-mobile` keeps the single exact entry
  [ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
  requires, and nothing is added to the list for a phone. What follows the
  origin is the web app's own redirect URIs, web origins and the two clients'
  root and base URL.
- **Exposure: in phone mode the tailnet's members reach the edge's three
  published ports, and nothing listens beyond loopback.** That is the web app,
  the API and Keycloak, through the same limits as a local caller. This is
  acceptable only while the tailnet holds the owner's own devices: another
  person's device joining it, or the Mac being shared into another tailnet, is a
  revisit trigger below. [Task 10](../tasks/iteration-10/10-the-edge-serves-only-what-a-client-needs.md)
  closes the admin, metrics and back-channel routes whatever the mode; with a
  tailnet of one owner it is not a prerequisite of phone mode, but it runs first
  in the iteration's order.
- **Plain HTTP for now.** WireGuard already encrypts the tailnet's traffic, and
  requesting no certificate publishes nothing. **The trigger for HTTPS** is the
  first rehearsal of a real deployment, or the first feature that needs it (a
  link that opens the app from an `https` address is the one
  [ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
  already names). The switch is then a configuration change (the same one value
  gains a scheme, and `tailscale serve` terminates TLS), a rebuild of the app,
  whose origins are inlined at build time, and a fresh sign-in, because the
  issuer changes with the scheme. **Before it, rename the machine to a neutral
  name:** a tailnet certificate would put the machine's name and the tailnet's
  into the public Certificate Transparency logs.
- **A release build in phone mode carries a cleartext exception scoped to the
  tailnet host, and no other build carries one.** iOS (App Transport Security)
  and Android both refuse plain HTTP in a release build unless the app declares
  an exception. It is generated from the one value into the native projects
  `expo prebuild` writes, which are not committed
  ([ADR-0094](0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)),
  as `plugins/withE2eCleartext.js` does for `localhost` under `KALIA_E2E=1`.
  [Task 05](../tasks/iteration-10/05-build-variants.md) owns the check that no
  other build carries it.
- **Worktrees.** Phone mode forwards the stack's own ports, so whichever one
  worktree is in phone mode serves the phone and nothing assumes the default
  ports. The forwards belong to the machine, not the worktree, so the switch is
  where a previous worktree's forwards are replaced.
- **The tailnet's name and the Mac's are host details.** They live in the root
  `.env` and nowhere else: never in a commit, a pull request, a comment or a
  generated file that is committed.

## Alternatives considered

**The Mac's address on the same Wi-Fi.** No new tool and no account.
Rejected: it works on one network only, so mobile data and every other Wi-Fi
fail; the address is handed out by the router and moves, and because it *is* the
issuer, a moved address is a stack whose issuer changed under it; and the edge
would have to be bound beyond loopback, so everyone on that Wi-Fi, a café's
included, could reach the web app, the API and Keycloak.

**A public tunnel.** One command gives a public HTTPS address, which also
removes the cleartext exception. Rejected: it puts the whole stack on the
internet, Keycloak's pages and admin routes included, for a use that has one
user; and an address on a free tier changes on every run, so the issuer, the
realm and the app's inlined origins would all change with it.

**Accepting both `localhost` and the tailnet name, or deriving the name from the
request.** The browser and the simulators would keep working in phone mode
without a switch. Rejected: Keycloak stamps one hostname per request when it
derives it, which is the inconsistency `docker-compose.base.yml` already
records, and a backend that accepts a set of issuers has weakened the `iss`
check ADR-0028 rests on, for a saving that is one `.env` edit.

**HTTPS from the start with `tailscale cert`.** The cleartext exception and its
check would disappear. Rejected for now: the tunnel is already encrypted, and
the certificate publishes the machine's and the tailnet's names in the public
Certificate Transparency logs, a disclosure that nothing yet needs. It stays the
recorded switch above.

**Phone mode as the only mode.** One configuration to explain. Rejected: CI and
every worktree would need a tailnet, the default would stop being loopback-only,
and the simulators would lose `localhost` for no gain.

## Consequences

- Good, because the owner's phone reaches the Mac on any network, including
  mobile data, at no cost and with no card on file.
- Good, because the tailnet name is stable, so the issuer does not move with a
  router, a network or a restart.
- Good, because the edge stays bound to loopback and the default stack, CI and
  the worktrees are unchanged.
- Good, because the issuer is built from one value, so a mismatch between what
  Keycloak stamps and what its consumers validate is something a check can
  assert in phone mode, as it can today.
- Bad, because the modes are exclusive: with phone mode on, the Android emulator
  and the browser on `localhost` do not work, and the Mac must be awake and signed
  in to Tailscale for the phone to work at all.
- Bad, because the traffic is plain HTTP inside the tunnel: the app needs a
  cleartext exception that exists only for the tailnet host, and a token
  travels without TLS, protected by the tunnel and, on the Mac, only by
  loopback.
- Bad, because every member of the tailnet reaches the web app, the API and
  Keycloak, admin console included until task 10 lands. The assumption that
  members are the owner's devices is the only control.
- Bad, because Tailscale is a third party's service: the Mac and the phone
  depend on its coordination server and on the free plan staying free and
  card-less.
- Bad, because switching mode changes the issuer, so an installed app is built
  for one mode and signs in again after a switch.
- Neutral, because a request through `tailscale serve` reaches the edge from the
  forwarder on the Mac's own side, so the edge's per-address limits see the
  owner's devices as one client, as they already see every local one on Docker
  Desktop (ADR-0090).
- Neutral, because no redirect URI changes: the callback is a scheme, not a
  host.
- **Revisit trigger:** another person's device in the tailnet, or the app
  installed beyond the owner's own phone (also ADR-0095's trigger); the HTTPS
  trigger above; a hosted backend, which replaces the route and the issuer;
  Tailscale asking for a card, or the Android emulator or the simulator needing
  phone mode.

## Evidence

Nothing here was measured: this is a decision recorded before it is built. The
product owner chose the route and the HTTP-first posture at refinement on
2026-11-01; the points below are the ones the choice rests on and that
[task 02](../tasks/iteration-10/02-the-phone-reaches-the-stack.md) must show true
on the running stack, amending this ADR if one is not.

**Not verified:**

- that `tailscale serve` forwards plain HTTP for each of the three ports, under
  the same port numbers, to the edge on `127.0.0.1`;
- that the Mac itself reaches its own tailnet name on those ports, which the
  browser on the Mac and the iOS Simulator in phone mode both depend on;
- that Keycloak, running with the local stack's `sslRequired` of `none`, answers
  the phone's sign-in over HTTP on a name that is not `localhost`;
- that the iPhone's development build, as well as its release build, reaches the
  tailnet host over HTTP with only the exception described above;
- that two worktrees, one in phone mode and one not, run beside each other
  without the machine's forwards colliding.
