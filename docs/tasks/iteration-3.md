# Iteration 3 — Production-readiness foundations

Goal: establish the backend and frontend conventions for exception
handling, logging, configuration and security that later iterations build
on, instead of retrofitting them once Auth (session cookies, secrets) and
Cellar (first mutating endpoints) land.

**Backend**

1. [x] Decision: structured logging conventions — SLF4J usage baseline, log levels per environment, what's logged when an exception falls through to the default handler, no secrets/PII in logs; document as an ADR
2. [x] Decision: shared exception-handling strategy beyond `catalog`'s module-scoped advice — field-level detail for Bean Validation failures (`MethodArgumentNotValidException`/`ConstraintViolationException`), malformed-JSON/405 handling, and where module-neutral advice can live without breaking ADR-0007's ArchUnit placement rule **[needs decision]**; document as an ADR
3. [x] Decision: configuration/profile strategy — split `application.properties` into base + `dev`/`test`/`prod` profiles, how secrets differ per profile; document as an ADR *(resolved against profiles — see [ADR-0015](../adr/0015-configuration-strategy.md))*
4. [x] Explicit actuator endpoint exposure (`management.endpoints.web.exposure.include`) instead of relying on undeclared defaults *(Quality backlog 2026-07-23, SHOULD-8)*
5. [x] Input-validation hardening as an applied convention: `minAbv <= maxAbv` cross-field check, an upper bound on ABV params, and `@Size` caps on free-text `query`/`style`/`country` *(Quality backlog 2026-07-23, SHOULD-3)*

**Frontend**

6. [ ] Harden `kaliaFetch`: guard `JSON.parse` against non-JSON error bodies *(Quality backlog 2026-07-23, MUST-3)*, add a request timeout, and introduce a typed `ApiError` distinguishing network/timeout/HTTP-status/parse failures — feeds the error-state work in [iteration 2 task 9](iteration-2.md)
7. [ ] Decision: security response headers (CSP, X-Frame-Options, Referrer-Policy, HSTS, Permissions-Policy) via `next.config.ts` `headers()` *(Quality backlog 2026-07-23, SHOULD-2)*; document as an ADR
8. [ ] Decision: environment-variable validation — fail fast on misconfigured/missing env vars instead of silent fallback defaults; document as an ADR
9. [ ] Client-side logging convention: a thin logger wrapper replacing ad hoc `console.*` calls, so a real monitoring tool can be swapped in later without touching call sites

**Cross-cutting**

10. [ ] Dependency-vulnerability scanning in CI: a Maven check (e.g. OWASP dependency-check) alongside an `npm audit` gate *(Quality backlog 2026-07-23, SHOULD-7)*

**Done when:** an unhandled backend exception is logged server-side with no
internal detail leaked to the client; an invalid ABV range or malformed
request returns a 400 with field-level detail; actuator exposes only the
intended endpoints; each environment is configured without hardcoded
secrets, and a missing required secret aborts startup naming it
([ADR-0015](../adr/0015-configuration-strategy.md) replaced the
profile-based wording this criterion originally used); a non-JSON backend
error response no longer crashes the
frontend and renders a friendly, accessible error state instead; every
response carries the agreed security headers; CI fails on a known-vulnerable
dependency in either app.
