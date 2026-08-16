# Task 10: Swagger UI OAuth2 authorization for authenticated endpoints

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

[Task 02](02-cellar-rest-api.md) shipped the first endpoints that require a
bearer token. Swagger UI (reachable at `localhost:8080` on the dev machine,
[architecture.md §6](../../architecture.md)) has no way to obtain one — trying
a cellar endpoint there today means minting a token some other way (`curl`,
Postman) and pasting it into the Authorize padlock by hand every time it
expires.

## Scope

Configure springdoc's OpenAPI security scheme so Swagger UI's own Authorize
button can drive a real OAuth2 flow against Keycloak and attach the resulting
token to every "Try it out" request against an authenticated endpoint.

## Non-goals

- Any change to the API's actual authentication
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)'s
  resource-server setup is unaffected — this is Swagger UI tooling only).
- Production exposure of Swagger UI — already gated behind
  `SPRINGDOC_ENABLED` and the loopback bind
  ([architecture.md §6](../../architecture.md)).

## Constraints

- Springdoc's `@SecurityScheme`/`@SecurityRequirement` annotations are the
  mechanism; where they live (a `@Configuration` class, the main application
  class, or `SecurityConfig`) is this task's call.
- Must not weaken `SecurityConfig`'s filter chain — this only changes how
  Swagger UI requests and displays a token, not what the backend accepts.
  ArchUnit's `onlyIdentityConfiguresWebSecurity` rule stays the guard for
  that ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)).
- Swagger UI gets its own Keycloak client, `kalia-swagger`: **public, no
  secret**, Authorization Code with PKCE. `kalia-frontend`'s confidential
  secret must not be exposed in Swagger UI's browser-visible OAuth config —
  the same reasoning the [backlog](../backlog.md)'s mobile-client analysis
  already applies to secret-less tool clients. Add the new client to
  `keycloak/realm-export.json` with redirect URI
  `http://localhost:8080/swagger-ui/oauth2-redirect.html`, rather than
  extending `kalia-frontend`'s client (product-owner decision, 2026-08-15).
- Flow is Authorization Code with PKCE, matching both the shape sketched in
  the PR #120 review comment that raised this task and how Keycloak's realm
  is already configured for `kalia-frontend` (product-owner decision,
  2026-08-15).
- The security scheme is marked required on every endpoint that requires a
  bearer token today, not `cellar` alone — including `IdentityController`'s
  `/me`. One consistent rule, no authenticated endpoint left without an
  Authorize-button affordance in Swagger UI (product-owner decision,
  2026-08-15).

## Open questions

**None.**

## Acceptance criteria

- [x] A developer can click Swagger UI's Authorize button, complete a
      Keycloak sign-in, and successfully call `GET /api/v1/cellar` from the
      "Try it out" panel without manually copying a token — verified by hand
      against the local docker-compose stack; this is dev tooling, so no
      automated test observes Swagger UI's own browser behavior
- [x] `/v3/api-docs` includes the configured security scheme and marks it
      required on every endpoint that needs it — integration test asserting
      `components.securitySchemes` and at least one authenticated operation's
      `security` array
- [x] `mvn verify` green

## Notes

Raised in review of [PR #120](https://github.com/MiguelSombrero/kalia/pull/120)
(task 02) — see that PR's review thread for the annotation shape sketched
there.
