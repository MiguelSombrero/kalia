# ADR-0025: Auth.js with a custom Valkey adapter for Keycloak authentication

- **Status:** accepted
- **Date:** 2026-07-28

## Context

`docs/architecture.md` §6 left the OIDC client implementation open — "Auth.js
or hand-rolled" — pending iteration 4 task 2. The same section also commits
to a **Valkey-backed session**: the browser holds only an opaque session
cookie, the actual session data lives server-side. Neither of Auth.js's two
built-in session strategies is a clean fit for that: `"jwt"` keeps the
session (including tokens) encrypted inside the cookie itself, and the
`"database"` strategy needs an Adapter, but Auth.js's only official
Redis-family adapter targets Upstash's proprietary REST API, not a
self-hosted Redis-protocol server. The two questions — which OIDC client,
and how the Valkey requirement gets satisfied — had to be resolved together.

Keycloak also runs on two different addresses in the docker-compose stack:
published to the host (and so the browser) on `127.0.0.1:8081`, but reachable
from the frontend container only via the internal Compose network as
`keycloak:8080`. Whatever OIDC client is chosen has to work across that split.

## Decision

**Use Auth.js (`next-auth` v5) with its official Keycloak provider for the
OIDC Authorization Code + PKCE mechanics, backed by a hand-written `Adapter`
(`frontend/lib/auth/valkeyAdapter.ts`) that implements Auth.js's documented
Adapter interface against Valkey via `ioredis`.**

- Auth.js owns every security-sensitive step of the flow — PKCE
  verifier/challenge, `state`, nonce, token exchange, ID-token/issuer
  validation. The only hand-written piece is the Adapter: a small, fully
  unit-tested storage layer (`valkeyAdapter.test.ts`) implementing a fixed,
  documented interface, not the OAuth protocol itself.
- Session data — user, linked Keycloak account (including tokens), and the
  session record itself — lives in Valkey under an `auth:*` key prefix.
  Session keys carry a native Valkey expiry matching Auth.js's own session
  `expires`, so expired sessions self-clean without a sweep job.
- Keycloak's hostname is fixed to its **public** address
  (`KC_HOSTNAME=http://localhost:8081`, `docker-compose.yml`), so every
  identity value it issues — discovery document `issuer`, callback `iss`,
  token claims — is consistent regardless of which of its two published
  addresses actually received a given request. The frontend container
  cannot reach that public address directly (loopback-only on the host), so
  outbound calls Auth.js makes to Keycloak (discovery, token exchange,
  userinfo, jwks) are transparently redirected to the internal Docker
  Compose origin via Auth.js's `[customFetch]` provider option
  (`frontend/lib/auth/internalKeycloakFetch.ts`) — only where the bytes are
  sent changes; the issuer identity Auth.js validates against does not.
- Sign-out is a custom route (`app/api/auth/federated-signout/route.ts`),
  not Auth.js's default `signOut()`: it also redirects the browser through
  Keycloak's `end_session_endpoint` so Keycloak's own SSO cookie is cleared,
  not just Kalia's session.

## Alternatives considered

**Hand-rolled OIDC client.** The initial recommendation, on the basis that
Valkey-backed sessions don't fit Auth.js's built-in strategies and this
codebase generally prefers small hand-written modules over heavier
dependencies (e.g. `ApiError`, `resolveLocale`). Reversed after the product
owner asked for the industry-standard, battle-tested option: hand-rolling
PKCE/state/nonce/token-exchange validation is exactly the code where a
subtle bug has real security consequences, and Auth.js ships a first-class
Keycloak provider purpose-built for this.

**Auth.js's `"jwt"` session strategy** (Auth.js's own default, and what most
production Next.js apps run). Rejected: session data would live encrypted in
the browser cookie, not in Valkey — the roadmap and `docs/architecture.md`
§6 specifically call for a Valkey-backed session, and a stateless cookie
does not become one just because Valkey happens to be running nearby.

**Auth.js's official `@auth/upstash-redis-adapter`.** Rejected: it is built
specifically for Upstash's hosted REST API (`@upstash/redis`), which cannot
address a self-hosted Valkey container speaking the plain Redis wire
protocol. A generic ioredis-based adapter has been an open, unimplemented
Auth.js feature request since 2023 (nextauthjs/next-auth#8285) — see
Evidence.

**Expose Keycloak's internal Docker hostname to the browser directly**
(skip the public/internal split and `customFetch` entirely). Rejected: a
real browser outside the Compose network cannot resolve `keycloak:8080` —
confirmed live, see Evidence.

**Fix `KC_HOSTNAME` to the internal address instead of the public one.**
The first attempt at solving the `iss` mismatch. Rejected: Keycloak then
stamps that same internal, browser-unreachable address into every absolute
URL it generates for the browser too, including its own login page's form
`action` — confirmed live, this broke sign-in outright, not just the
callback.

## Consequences

- Good, because the OAuth-protocol-sensitive code is Auth.js's, reviewed and
  exercised far beyond what this project could validate on its own; the
  project's own surface area is one small, interface-constrained Adapter.
- Good, because sessions genuinely live in Valkey and expire via Valkey's
  own TTL mechanism, with no separate cleanup process to maintain.
- Neutral, because `next-auth` is pinned to `5.0.0-beta.32` — the current de
  facto release line for Auth.js on Next.js (v4 is legacy), but not yet a
  stable `5.0.0`. A future bump may change behavior this ADR assumes.
- Bad, because reconciling Keycloak's two addresses cost real, non-obvious
  debugging effort (three distinct failures in sequence: an untrusted-host
  rejection, a browser-unreachable `0.0.0.0` URL, and an issuer mismatch)
  and the resulting `customFetch` + fixed-hostname combination is not
  something a future contributor would derive from Auth.js's docs alone —
  this ADR is the record of why it looks the way it does.
- Bad, because Auth.js does not support federated (RP-initiated) logout out
  of the box (documented in its own `next-auth/adapters.d.ts` as a known
  gap), requiring the custom `federated-signout` route rather than relying
  on `signOut()` alone.
- **Revisit trigger:** if Auth.js ships an official adapter for a
  self-hosted Redis-protocol server, or once `next-auth` v5 reaches a stable
  release, re-check whether either changes this decision's cost side.

## Evidence

Measured against `next-auth@5.0.0-beta.32`, `@auth/core` (bundled),
`quay.io/keycloak/keycloak:26.7.0`, in this repo's docker-compose stack.

- **Untrusted host:** without `trustHost: true`, every request failed with
  `[auth][error] UntrustedHost: Host must be trusted` — required for any
  Auth.js deployment not running on Vercel.
- **Unreachable internal hostname in browser-facing URLs:** with
  `AUTH_KEYCLOAK_ISSUER=http://keycloak:8080/realms/kalia` (the internal
  address) and no `authorization` override, the rendered sign-in form's
  `action` attribute read `http://0.0.0.0:3000/api/auth/signin/keycloak` —
  the container's own bind address, not the browser-reachable one — and the
  browser's CSP (`form-action 'self'`) silently blocked the mismatched-origin
  submission.
- **Issuer mismatch:** overriding just the `authorization` endpoint to the
  public URL while leaving `issuer` internal produced, on callback:
  `CallbackRouteError … unexpected "iss" (issuer) response parameter value`,
  with `{"expected": "http://keycloak:8080/realms/kalia"}` — Keycloak
  reports the browser-reaching hostname (`localhost:8081`) in the callback's
  `iss` param, but `oauth4webapi` (which Auth.js uses) validates it against
  whatever `issuer` was configured for server-side discovery.
- **`@auth/upstash-redis-adapter` genuinely requires Upstash's REST API**:
  confirmed via `authjs.dev`'s adapter reference and
  `nextauthjs/next-auth#8285` ("Support for generic Redis adapter"), open
  since 2023 with no merged implementation as of this writing.
- **Fixed-internal-hostname login-page breakage:** with
  `KC_HOSTNAME=http://keycloak:8080`, Keycloak's own rendered login page
  posted to `http://keycloak:8080/realms/kalia/login-actions/authenticate?…`
  — unreachable from a real browser; sign-in could not complete at all.
- **Federated logout needs a client attribute:** without
  `attributes.post.logout.redirect.uris` set on the Keycloak client
  (`keycloak/realm-export.json`), Keycloak's `end_session_endpoint`
  returned its own HTML logout-confirmation page (`<title>Logging out</title>`)
  instead of redirecting through `post_logout_redirect_uri`, even with a
  valid `id_token_hint` for an active session.
