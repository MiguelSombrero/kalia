# Task 01: Decide who is an admin, and how every tier knows it

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-4

## Why

Kalia has no roles. The realm defines none (`keycloak/realm-export.json`), the
backend maps no authority from a token and authorises every signed-in caller
alike ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)), and
the web shows the same pages to everyone signed in. Review of contributed beers
is an operator running SQL against the database
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
which this iteration replaces with an admin page.

Where the role lives, how it reaches the backend and the web, and how a
deployment gets its first admin are decided once and inherited by every later
privileged feature. Several of the ways to get it wrong fail silently: a role
missing from the access token presents as an admin who is refused, not as a
configuration error, and a role granted by the realm's default roles makes
every self-registered account an admin.

## Scope

An ADR records where the admin role is defined and granted, how the backend
and the web each learn that the caller holds it, what a caller without it is
answered, how the local stack seeds a development admin, and how a deployment
would make its first one.

## Non-goals

- Implementing it — [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)
  for the realm and the backend,
  [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
  for the web.
- More than one privileged role, or permissions finer than "admin".
- The mobile app: this iteration builds no admin surface on a phone.

## Constraints

- The realm is applied by `keycloak-config` on every startup and fully
  reconciled ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md));
  a role or a grant made in the admin console is overwritten on the next
  `docker compose up`.
- Self-registration is open ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)):
  whatever the realm's default roles hold, every new account receives.
- The dev account `testuser` is created by `scripts/seed-keycloak-account.mjs`,
  run by the local stack's `keycloak-seed` service, not by the realm file and
  not by SQL. A deployment must not inherit a dev account
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)):
  the base compose file seeds nothing.
- Both the web and the mobile client must carry the `kalia-backend` audience
  mapper, or their tokens fail the audience check
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md));
  a role claim has the same failure shape.
- An access token outlives a change to the user's roles for up to its lifespan
  ([architecture §8](../../architecture.md#8-trade-offs-made-explicit)).
- The edge answers `404` for `/admin`, Keycloak's console path
  ([architecture §6](../../architecture.md#6-authentication-and-identity));
  a web route there is unreachable through the edge.
- The decision is an ADR only if it passes
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s three tests; a
  privileged role every later admin feature inherits is expected to.

## Open questions

1. **Where the role is defined:** a realm role, a role of the `kalia-backend`
   client, or a group whose membership carries it — and its name (`ADMIN`,
   `admin`, `kalia-admin`).
2. **How the backend reads it:** the token's role claim mapped to a Spring
   authority, with the rule on a path prefix (`/api/v1/admin/**`) or on each
   method — and whether `identity` exposes "is the caller an admin" to other
   modules through `IdentityApi`.
3. **What a non-admin is answered** by an admin endpoint — `403`
   `problem+json`, or `404` so the endpoint's existence is not disclosed — and
   by an admin page in the web.
4. **How the web knows:** read from the access token the session already
   holds, or asked of the backend; and whether the answer is ever sent to the
   browser or only used server-side.
5. **The development admin:** a second seeded account beside `testuser` (its
   username and password), or `testuser` itself holding the role — weighed
   against the end-to-end suites, which sign in as `testuser` and would then
   always see admin navigation.
6. **The first admin of a deployment:** granted by hand in Keycloak's admin
   console, by a seed step that runs only when asked, or not yet decided
   because no deployment exists — and where that is written down.
7. **How quickly a revoked role takes effect,** given the access token's
   lifespan: accepted as the existing trade-off, or checked against Keycloak
   on admin calls.

## Acceptance criteria

- [ ] An ADR records where the role is defined and granted, how the backend
      and the web each read it, what a non-admin is answered, the development
      admin, a deployment's first admin, and the rejected alternatives, and
      passes `node scripts/check-adrs.mjs`
- [ ] Each test the decision implies — a self-registered account not holding
      the role, a token without it refused, a token with it admitted, the base
      compose file seeding no admin — is named in the acceptance criteria of
      [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)
      or [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
      before either is refined

## Notes

Provenance: the product owner's brief for iteration 10.5, and the backlog's
"Admin UI + role-based access for catalog management". ADR-0091's revisit
trigger — "a contributor-visible outcome … asks for the roles and page the
backlog already names" — is what this iteration answers. A decision task, so
it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
