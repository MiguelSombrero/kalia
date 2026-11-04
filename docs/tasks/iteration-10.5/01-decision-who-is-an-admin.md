# Task 01: Decide who is an admin, and how every tier knows it

- **Status:** refined
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
- The edge answers `404` for `/admin` on Keycloak's origin only — the
  `8081` server in `edge/nginx.conf`
  ([architecture §6](../../architecture.md#6-authentication-and-identity));
  the web's origin serves `/[locale]/admin` like any other route.
- The Playwright specs sign in as `e2e-worker-N` accounts they provision at
  run time, not as `testuser`
  ([iteration 6.5 task 09](../iteration-6.5/09-deterministic-test-accounts.md)).
- The decision is an ADR only if it passes
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s three tests; a
  privileged role every later admin feature inherits is expected to.

**Decided at refinement, 2026-11-04** (product owner):

- **A realm role named `admin`,** granted to nobody by default and never a
  member of `default-roles-kalia`. Keycloak's built-in `roles` client scope
  already writes realm roles to the access token's `realm_access.roles` for
  both clients that sign in, `kalia-web` and `kalia-mobile`, so no mapper is
  added. A client role on `kalia-backend`
  and a group carrying the role were rejected.
- **The backend maps `realm_access.roles` to Spring authorities and enforces
  one rule on the path prefix `/api/v1/admin/**`** in the security chain,
  pinned by a test. `IdentityApi` gains no "is the caller an admin" until
  another module needs it.
- **A non-admin is answered `403` `problem+json` by the API;** an anonymous
  caller keeps its `401`. A `404` was rejected: the committed spec is public,
  so it would hide nothing. **The web answers everyone but an admin — a
  signed-out visitor and a signed-in non-admin alike — with its ordinary
  not-found page,** so the area is never shown to exist; an admin signs in
  first and follows the navigation entry. The cellar's in-page sign-in prompt
  and a redirect to sign in were rejected, since both show a signed-out
  visitor that the area exists.
- **The web reads the role in the BFF, from the access token** the session
  already holds — the token the backend authorises, so the two cannot
  disagree. Only a boolean reaches the browser, to render the navigation
  entry; the backend stays the authority on every call. Asking the backend on
  every render and reading the ID token were rejected.
- **The local stack seeds a second account, `testadmin`,** beside `testuser`
  through `keycloak-seed`, its password a dev default in
  `docker-compose.dev.env`; the base compose file seeds none. `testuser` keeps
  showing what an ordinary user sees. Playwright's own admin is
  [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)'s.
- **A deployment's first admin is left undecided** until a deployment exists:
  the ADR says so, and [the backlog](../backlog.md)'s deployment item carries
  it.
- **A revoked role holds until the access token expires** — the realm's
  `accessTokenLifespan`, 300 s — the trade-off
  [architecture §8](../../architecture.md#8-trade-offs-made-explicit) already
  accepts. Checking Keycloak on each admin call was rejected.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records where the role is defined and granted, how the backend
      and the web each read it, what a non-admin is answered, the development
      admin, that a deployment's first admin is left undecided, and the
      rejected alternatives, and
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
