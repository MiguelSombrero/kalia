# ADR-0090: An nginx edge proxy bounds the anonymous edges and names the client address the services trust

- **Status:** accepted
- **Date:** 2026-10-26

## Context

Three things in front of the stack were unbounded. A script posting straight to
Keycloak's registration endpoint bypasses the `/sign-up` limiter, which gates
only Kalia's own button ([ADR-0055](0055-self-registration-via-keycloak.md)),
and each registration sends a verification email from a shared sender. The
back-channel logout route parsed its whole body, then verified an RS256
signature, on the one Node process that serves every user's pages
([ADR-0031](0031-backchannel-logout.md)); the proxy matcher's `api` exclusion
means Next.js applies no body limit to it. And the backend API had no throttle
of any kind.

A limiter keyed on a caller-supplied header is no limit at all, which is why
ADR-0055 kept its counter global: this stack had no hop that a caller's
`X-Forwarded-For` could not pass through. The unauthenticated edges are what
[iteration 9](../tasks/iteration-9.md)'s mobile client and the first
deployment expose, so the hop had to exist first
([task 10](../tasks/iteration-8.5/10-unauthenticated-edges-throttled.md)).
[Task 11](../tasks/iteration-8.5/11-one-account-cannot-inflate-an-anonymous-read.md)
and [task 12](../tasks/iteration-8.5/12-user-added-catalog-entries-governed.md)
assume registration is expensive.

## Decision

**An nginx container, `edge`, is the only service of the deployable stack that
publishes a port; it forwards the frontend, the backend API and Keycloak, each
on the host port it already had, and limits requests and bodies per client
address.** It lives in `docker-compose.base.yml`, not the dev overlay, because
a deployment needs it for the same reasons the dev stack does
([ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)
puts in the base whatever is not a dev convenience).

- **The client address is the socket's.** The proxy is the outermost hop and
  sets `X-Forwarded-For` to the address it saw, replacing the caller's value.
  Keycloak (`KC_PROXY_HEADERS=xforwarded`) and Spring
  (`server.forward-headers-strategy=native`) honour that header only from a
  peer inside the stack's private ranges; the request log of each names the
  address it resolved. The frontend passes the address it was given on to the
  backend, because Spring sees the frontend as its peer.
- **Per-address limits, one zone per kind of request**, so a flood of page
  loads cannot spend the budget for registrations. The limits are below;
  a request over its zone's rate and burst is answered `429` by the proxy.
- **Bodies are bounded at the proxy** and, for the back-channel logout route,
  again in the route: it reads at most 16 KiB, counting the bytes that arrive
  rather than trusting `Content-Length`, and answers `413` before any token is
  verified.
- **Upstreams are resolved on each request**, through Docker's DNS, so the
  proxy needs no `depends_on` and keeps working when a service is recreated.
- **The image is `nginxinc/nginx-unprivileged`, pinned to the current stable
  tag, with `apk upgrade` on top**, as `frontend/Dockerfile` does for the same
  reason ([ADR-0024](0024-dependency-vulnerability-scanning.md)). The vulnerability scan builds and scans it with
  the other two images.
- `X-Content-Type-Options: nosniff` joins [ADR-0016](0016-security-response-headers.md)'s
  headers, and `poweredByHeader` is off.

| Zone | Applies to | Rate | Burst | Largest body |
|---|---|---|---|---|
| registration | `POST` to Keycloak's `login-actions/registration` and `protocol/openid-connect/registrations` | 6 per minute | 20 | 256 KiB |
| logout | the frontend's `/api/auth/backchannel-logout` | 30 per minute | 10 | 16 KiB |
| backend | everything on the backend's port | 10 per second | 30 | 64 KiB |
| keycloak | everything else on Keycloak's port | 20 per second | 60 | 256 KiB |
| frontend | every page and action | 150 per second | 300 | 1 MiB |
| static | `/_next/static/` and Keycloak's `/resources/` | 150 per second | 400 | — |

Per-user limits stay in Spring as business rules; this decision adds none.
TLS waits for a deployment.

## Alternatives considered

**Spring Cloud Gateway.** Rejected by the product owner for now: a heavier new
JVM service that would not naturally front Keycloak's pages, and one that would
pre-empt iteration 9's decision on whether the mobile client gets a BFF of its
own.

**Limiters inside each application** (a Bucket4j filter in Spring, a counter
in the Next.js proxy). Rejected: Keycloak's registration endpoint, the one the
bypass uses, would stay unthrottled, and a limiter keyed on a header the
application is handed is only as good as whoever set it. The sign-up counter
stays as the bound on Kalia's own button.

**Trusting forwarded headers from the proxy's exact address.** Rejected: it
means pinning the compose network's subnet, which two worktrees running a stack
each would then collide on, or resolving the proxy's address at every service's
startup, which three different images would each need a wrapper script for.
Nothing but the proxy publishes a port, so the private ranges are the same
boundary in practice.

**Keycloak's PROXY protocol support.** Rejected: it makes Keycloak refuse every
connection that does not begin with the header, including the frontend's own
calls to it and the realm importer's.

**The official `nginx` image.** Equivalent configuration, but it starts as root;
the unprivileged build is the same nginx with that removed.

**Proxy in the dev overlay only.** Rejected: the dev stack would be the only
place the limits were exercised, and a deployment would have to rediscover
them.

## Consequences

- Good, because registrations, back-channel logout and the API each have a
  bound a script cannot step around, and a request over it never reaches the
  service.
- Good, because the services see a client address no caller can choose, so a
  per-address limit or an abuse investigation has something true to use.
- Good, because the backend and Keycloak are no longer published, so Swagger
  UI, the API and the admin console reach them only through the limits.
- Good, because a back-channel logout body is bounded twice, and the route no
  longer verifies a token it was never going to accept.
- Bad, because the limits are per address: an attacker with many addresses
  gets many budgets, and many people behind one address share one. On Docker
  Desktop every local client arrives from the gateway's address, so the e2e
  suite is one client.
- Bad, because the browser-facing zones are loose. A full `npm run test:e2e`
  from one address is the worst realistic client, and the limits sit about
  twice its peak (see Evidence); only registration, logout and the backend
  are tight.
- Bad, because every request log line now carries the client's IP address,
  which is personal data and which [ADR-0013](0013-logging-conventions.md)'s
  "no PII in log lines" did not foresee: the address is what an abuse
  investigation needs, so ADR-0013 is read as excepting it, and the logs
  need a retention story at the first deployment.
- Bad, because the frontend's page responses are not buffered by the proxy,
  so that Server Components can stream; a deliberately slow reader holds a
  Node response open for as long as it likes, within the page limit.
- Bad, because trust is by network range, not by the proxy's own address: a
  container added to the stack's network could forge the header. Nothing else
  reaches the three services' ports today.
- Bad, because a deployment that puts another load balancer in front of `edge`
  would see that balancer's address everywhere until the proxy is taught to
  read it.
- Neutral, because [ADR-0003](0003-bff-pattern.md)'s "the Spring API is not
  exposed publicly" was already out of date (the backend was published on the
  loopback); it is now reached through the proxy, still on the loopback.
- Neutral, because ADR-0055's account of why the sign-up counter is global is
  amended: the counter stays global, protecting a shared mail budget, while a
  per-address bound now exists in front of it.
- **Revisit trigger:** the first deployment, which brings TLS, a real client
  address behind a balancer, and traffic to size these limits from.

## Evidence

Measured on 2026-10-26 with one full `npm run test:e2e` (170 tests, 1.7
minutes, one address), counting the proxy's access log in windows:

| Zone | Peak per second | Peak per 10 s | Peak per minute |
|---|---|---|---|
| frontend | 136 | 993 | 4,588 |
| static | 193 (frontend) and 54 (Keycloak) | 757 and 291 | 3,122 and 745 |
| keycloak | 21 | 82 | 261 |
| registration submissions | — | 8 in the whole run | 8 |
| backend | 1 | 3 | 3 |

The first limits tried, 30 per second with a burst of 60 for pages, failed 23
of the 170 tests; a navigation prefetches several routes at once. With the
limits above the suite passes, 170 of 170, and the proxy refuses nothing.
The largest request the suite made, headers included, was 3.3 KB. The backend
figure is low because the BFF reaches Spring over the compose network, not
through the proxy.

`nginxinc/nginx-unprivileged:stable-alpine` reports nginx 1.30.6 and is the
same image as the `1.30.6-alpine` tag. Trivy found two fixable HIGH findings in
it (`brotli-libs`, and `curl` with `libcurl`); built with `apk upgrade`, it
found none.

A request carrying `X-Forwarded-For: 203.0.113.77` through the proxy was logged
by Spring, by Keycloak and, via the frontend, by Spring again, under the
address the proxy's own log gives for it; none of the three logs contains the
forged one. Straight to Spring's port (`UntrustedProxyClientAddressIT`), from a
peer outside the trusted ranges, the same header is ignored.
