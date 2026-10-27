# Task 10: The unauthenticated edges are throttled and bounded

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**Self-registration is unthrottled.** The `/sign-up` limiter
(`frontend/features/auth/signUpRateLimit.ts`) gates only Kalia's own button. A
script posting straight to Keycloak's `/protocol/openid-connect/registrations`
bypasses it, as [ADR-0055](../../adr/0055-self-registration-via-keycloak.md):120-126
records. That is what makes [task 11](11-one-account-cannot-inflate-an-anonymous-read.md)
and [task 12](12-user-added-catalog-entries-governed.md)'s abuse cheap.

**Back-channel logout parses an unbounded body before it verifies anything.**
`frontend/app/api/auth/backchannel-logout/route.ts:18-28` calls
`request.formData()` before `validateLogoutToken` (an RS256 verification), on
the single Node process that serves every user's pages, and
`proxyClientMaxBodySize` does not apply because the proxy matcher excludes
`api` (`frontend/proxy.ts:33`).

**The backend API has no throttle at all** — no rate-limit dependency or code
in `backend/src/main` or `pom.xml` — though Keycloak lockout
([ADR-0061](../../adr/0061-brute-force-lockout-is-temporary-and-disclosed.md))
answers password grinding. `docs/tasks/backlog.md` files "TLS, rate limiting"
under the mobile client's public-API exposure, not as a gate.

**Two headers are off.** `X-Content-Type-Options: nosniff` is the one standard
header missing from [ADR-0016](../../adr/0016-security-response-headers.md)'s
set (`frontend/next.config.ts:14-27`), not recorded as considered-and-rejected;
with `script-src 'unsafe-inline'` accepted, the CSP would not stop a
sniffed-into-HTML response. `poweredByHeader` is left on, so every response
advertises `X-Powered-By: Next.js`.

## Scope

Registration, back-channel logout and the backend API each have a bound on
how fast or how large an anonymous caller can push them, enforced by an edge
proxy every request passes through. Responses carry `nosniff` and no `X-Powered-By`.

## Non-goals

- Per-user quotas on stored data — [task 11](11-one-account-cannot-inflate-an-anonymous-read.md).
- TLS — there is no deployment.

## Constraints

- [ADR-0055](../../adr/0055-self-registration-via-keycloak.md): this stack has
  no reverse proxy, so no header a caller cannot forge identifies them; a
  per-identity limiter is bypassable unless something trustworthy sets it.
- [ADR-0031](../../adr/0031-backchannel-logout.md): the back-channel route
  stays unauthenticated, verified by the Logout Token's signature.
- A new dependency or container is a version question for the product owner.
- `frontend/README.md`: `headers()` in `next.config.ts` is fixed at build time.

**Decided at refinement, 2026-10-24** (product owner):

- **An nginx edge proxy** in the compose stack, in front of Keycloak, the frontend and the backend: per-client-address request limits, body-size limits (the back-channel route's included), and a trustworthy forwarded client address for everything behind it. Spring Cloud Gateway was rejected for now: a heavier new service that would not naturally front Keycloak's pages, and one that would pre-empt iteration 9's "does mobile get a BFF of its own" decision. Application-level limiters alone were rejected because Keycloak's registration endpoint would stay unthrottled.
- **Per-user limits stay in Spring**, as business rules ([task 12](12-user-added-catalog-entries-governed.md)'s pending cap is one).
- **The nginx image version** is proposed by the implementer from authoritative output (`docker pull`, Trivy) as the then-current stable tag, and confirmed by the product owner in the PR.
- **Limits** are proposed in the ADR from measured normal use (a full e2e run must pass under them) and approved with it.
- **Recorded in a new ADR** naming the rejected gateway and in-app options; ADR-0003's "the Spring API is not exposed publicly" consequence is amended, since the proxy now fronts it.

## Open questions

**None.**

## Acceptance criteria

- [x] Registering past the chosen limit is refused whether through Kalia's
      button or Keycloak's endpoint directly — an e2e or integration test
- [x] A back-channel logout POST over the size cap is refused before any token
      verification — a vitest test confirms `validateLogoutToken` is never
      called
- [x] A burst past the proxy's limit on the backend's anonymous routes is
      refused with 429 before it reaches Spring — a check against the running
      stack, run in CI
- [x] Keycloak, Spring and the frontend see the client address the proxy
      forwards, and trust it only from the proxy — an integration or e2e test
- [x] A full `npm run test:e2e` run passes through the proxy under the limits
      the ADR sets
- [x] Responses carry `X-Content-Type-Options: nosniff` and no `X-Powered-By`
      — asserted by the existing security-headers test; ADR-0016 lists the
      header
- [x] `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-27 (corrected on
2026-10-24) and COULD-18 (with `X-Powered-By`).
