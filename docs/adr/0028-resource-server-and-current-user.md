# ADR-0028: The backend is an OAuth2 resource server, and the token's subject is the user

- **Status:** accepted
- **Date:** 2026-07-31

## Context

Sign-in works (iteration 4 task 2) but stops at the frontend: the browser gets
a session, and the backend API is unauthenticated. `docker-compose.yml`
publishes it on loopback only precisely because anything else would expose an
open API. The cellar (iteration 5) is per-user data and cannot be built until
the backend can say who is calling.

Three things were undecided. The realm had one client, `kalia-frontend`, and
issued access tokens carrying no audience any resource server could check.
Nothing said which identifier is *the* user id — the frontend's session
exposes an Auth.js adapter-generated `user.id`, which is not the Keycloak
subject in the token. And with the cellar an iteration away, no protected
endpoint existed against which any of this could be shown to work.

## Decision

**The Spring Boot API is an OAuth2 resource server that validates bearer
tokens on every route except the catalog, and the Keycloak `sub` claim is the
canonical user identifier.**

- **Default deny.** The filter chain permits the catalog reads
  (`GET /api/v1/beers`, `/api/v1/beers/{id}`, `/api/v1/breweries`),
  `/actuator/health`, and the API-documentation routes; everything else
  requires a valid token. Browsing stays anonymous
  ([ADR-0006](0006-cellar-first.md)) and every endpoint added later is
  protected unless someone deliberately opens it.
- **Three checks on a token:** signature against Keycloak's JWKS, `iss`, and
  `aud` containing `kalia-backend`. The realm gains a `kalia-backend` client
  and an audience mapper on `kalia-frontend` so that audience exists. Without
  the audience check any token the realm issues to any client would be
  accepted by this API.
- **`sub` is the user id.** The `identity` module maps it to
  `CurrentUser.id`, and per-user data keys on it. The backend therefore trusts
  only the signed token, never a value the frontend supplies.
  `preferred_username` is display-only: Keycloak lets it change.
- **No CSRF token, and no session.** A CSRF attack needs the browser to
  attach a credential on its own; this API accepts only an `Authorization`
  header, issues no cookie and keeps no session, so a cross-site request
  reaches it with no credential at all. The premise is what makes this safe,
  not the configuration flag, so a test pins it rather than a comment alone.
- **`GET /api/v1/me`** returns the current user. It gives the iteration's
  "the backend knows who is calling" something to be verified against, and it
  is the shape the cellar endpoints will reuse. `/me` follows this API's
  existing precedent of a top-level path whose user is implied by the
  credential — `docs/architecture.md` §4 already documents `GET /api/v1/cellar`
  that way rather than as `/users/{id}/cellar`.
- **The BFF attaches the token** in `lib/api/mutator.ts`, and withholds one
  that has expired.

Silent token refresh stays out (iteration 4 task 8), so a caller's access to
protected endpoints ends when the token does.

## Alternatives considered

**Validate issuer and signature only, skipping the audience.** No realm change
and less to explain. Rejected because it makes every client of the realm a
client of this API: a second application added to `kalia` later would gain
backend access silently, and nothing would fail to signal it.

**Key per-user data on the Auth.js adapter's `user.id`.** It is what the
frontend session already exposes, so the cellar could read it without a token
claim. Rejected because it asks the backend to trust an identifier that is not
in the signed token, and because that id exists only in Valkey — a flushed
cache would orphan every cellar row, while `sub` is reproducible from Keycloak
forever.

**`GET /api/v1/users/me`.** The other common convention, and arguably tidier
REST. Rejected because it invents a `users` collection this API does not have
and contradicts the `/api/v1/cellar` shape already documented.

**Spring Boot's `spring.security.oauth2.resourceserver.jwt.issuer-uri`.** One
property instead of a hand-built decoder. Rejected because it uses one address
for two jobs — the identity to compare `iss` against, and the host to fetch
keys from — and under docker-compose those are different addresses (see
Consequences).

**Ship the resource server with no protected endpoint, deferring `/me` to the
cellar iteration.** The smallest diff. Rejected because the iteration's
"Done when" requires the backend to know who is calling, and nothing would
have demonstrated it.

## Consequences

- Good, because every future endpoint is protected by default; opening one is
  a visible edit to `SecurityConfig`.
- Good, because the backend depends only on the token. It holds no user table
  and needs no call back to the frontend or to Keycloak per request.
- Bad, because Keycloak is now two addresses in configuration
  (`KEYCLOAK_ISSUER_URI`, `KEYCLOAK_JWK_SET_URI`) rather than one. The public
  address is what Keycloak stamps into `iss`; the internal one is the only
  route out of the backend container. The same split
  [ADR-0025](0025-authjs-valkey-adapter.md) records for the frontend, arrived
  at for the same reason.
- Bad, because **an invalid bearer token makes even a public endpoint answer
  401** — Spring Security authenticates the token before it checks whether the
  route is permitted. Since the BFF attaches a token to every backend call,
  including catalog reads, an expired one would break anonymous browsing for a
  signed-in user. The frontend withholds expired tokens to avoid it; that
  workaround is only needed until task 8 adds refresh.
- Neutral, because the BFF now reads Valkey on backend calls made by a
  signed-in user, including public catalog reads that do not need a token.
- Neutral, because `CurrentUser.id` is a `UUID`, which is Keycloak's subject
  format and not OIDC's requirement — `sub` is a string in the spec. A
  different identity provider would need the type widened.
- Neutral, because CSRF protection is off, which static analysis flags on
  sight (CodeQL `java/spring-disabled-csrf-protection`). The finding is a
  false positive only for as long as this API stays cookie-free and
  sessionless — `issuesNoCookieSoCsrfCannotApply` is what keeps that
  checkable rather than remembered.
- **Revisit trigger:** a second backend client, a non-Keycloak identity
  provider, anything here authenticating by cookie or creating a session, or
  task 8 landing refresh — the last removes the expired-token workaround's
  reason to exist.

## Evidence

Verified against the running `docker compose` stack on 2026-07-31, driving the
real authorization-code flow rather than a mocked token:

- A Keycloak-issued token carries `iss: http://localhost:8081/realms/kalia`
  (the public address) and `aud: kalia-backend`, confirming the audience
  mapper. `GET /api/v1/me` with it returns
  `{"id":"058f9338-…","username":"testuser","email":"testuser@example.com","name":"Test User"}`,
  with the backend fetching JWKS from `http://keycloak:8080/…` — so the
  public-issuer/internal-JWKS split works.
- `GET /api/v1/me` answers 401 with no token and 401 with a malformed one.
  `GET /api/v1/beers` answers 200 with no token.
- **`GET /api/v1/beers` answers 401 when the request carries an invalid bearer
  token**, despite being `permitAll`. This is what makes withholding expired
  tokens necessary rather than merely tidy.
- The realm's `accessTokenLifespan` is 300 seconds while the Auth.js session
  outlives it, so the expired-token window opens roughly five minutes after
  any sign-in — reachable, not theoretical.
- With a stored token's `expires_at` forced into the past, a signed-in
  browser still renders the full catalog.
