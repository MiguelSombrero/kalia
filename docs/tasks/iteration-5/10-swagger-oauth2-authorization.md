# Task 10: Swagger UI OAuth2 authorization for authenticated endpoints

- **Status:** needs-refinement
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

## Open questions

1. **Does Swagger UI get its own Keycloak client, or reuse
   `kalia-frontend`'s?** A new `kalia-swagger` client needs its own redirect
   URI (`http://localhost:8080/swagger-ui/oauth2-redirect.html`) added to
   `keycloak/realm-export.json`; reusing `kalia-frontend` needs that redirect
   URI added to its existing list instead. `kalia-frontend` is a confidential
   client with a secret — is exposing that secret acceptable for a dev-only,
   loopback-only tool, or does this warrant a public client with PKCE, the
   way the [backlog](../backlog.md)'s mobile-client analysis recommends for
   a similar reason?
2. **Authorization Code with PKCE, or another flow?** The shape sketched in
   the review comment that raised this used `authorizationCode`; confirm
   that's still right given Keycloak's realm is Authorization-Code-only for
   the frontend today.
3. **Scope: `cellar` only, or every authenticated endpoint?** Should the
   security scheme also mark `IdentityController`'s `/me` as requiring it, or
   is per-module opt-in fine for now?

## Acceptance criteria

- [ ] A developer can click Swagger UI's Authorize button, complete a
      Keycloak sign-in, and successfully call `GET /api/v1/cellar` from the
      "Try it out" panel without manually copying a token — verified by hand
      against the local docker-compose stack; this is dev tooling, so no
      automated test observes Swagger UI's own browser behavior
- [ ] `/v3/api-docs` includes the configured security scheme and marks it
      required on every endpoint that needs it — integration test asserting
      `components.securitySchemes` and at least one authenticated operation's
      `security` array
- [ ] `mvn verify` green

## Notes

Raised in review of [PR #120](https://github.com/MiguelSombrero/kalia/pull/120)
(task 02) — see that PR's review thread for the annotation shape sketched
there.
