# ADR-0101: An admin is a realm role in the access token, which the backend enforces on one path prefix and the web reads in its BFF

- **Status:** accepted
- **Date:** 2026-11-05

## Context

Kalia has no roles. The realm defines none, the backend authorises every
signed-in caller alike ([ADR-0028](0028-resource-server-and-current-user.md)),
and the web shows the same pages to everyone signed in. Review of contributed
beers is an operator running SQL against the database
([ADR-0091](0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
and [iteration 10.5](../tasks/iteration-10.5.md) replaces that with an admin
page. ADR-0091 rejected "an approver role and review page" as larger than the
need then; its revisit trigger — a contributor-visible outcome asking for the
role and the page — is what this iteration answers.

Where the role lives, how each tier learns the caller holds it, and how a
deployment gets its first admin are decided once and inherited by every later
privileged feature. Several ways to get it wrong fail silently. A role missing
from the access token presents as an admin who is refused, not as a
configuration error. A role among the realm's default roles is granted to every
account, and self-registration is open
([ADR-0055](0055-self-registration-via-keycloak.md)), so every visitor would be
an admin. A role or grant made in Keycloak's console is overwritten by the next
startup, since the realm file is fully reconciled
([ADR-0054](0054-keycloak-config-cli-realm-management.md)).

Decided with the product owner at refinement on 2026-11-04.

## Decision

**An admin is a holder of the realm role `admin`, which Keycloak writes to the
access token and which the backend and the web each read from it — the backend
to refuse everyone else on the path prefix `/api/v1/admin/**`, the web to show
the admin area to nobody else.**

- **The role is defined in `keycloak/realm-export.json`** and granted to no
  one by it. It is never a member of `default-roles-kalia`, so a
  self-registered account never holds it. It is one role: nothing finer than
  "admin" and no second privileged role exists.
- **It reaches the token through Keycloak's built-in `roles` client scope,**
  which both clients that sign in, `kalia-web` and `kalia-mobile`, already
  carry by default and which writes `realm_access.roles`. No mapper is added.
  The mobile app gains no admin surface; it carries the claim only because it
  holds the same scope.
- **The backend maps `realm_access.roles` to Spring authorities and enforces
  one rule, on the prefix `/api/v1/admin/**`,** in the security chain
  ([ADR-0028](0028-resource-server-and-current-user.md)), pinned by a test. A
  later admin route is covered by sitting under the prefix, not by a rule of
  its own. `IdentityApi` gains no "is the caller an admin" until another module
  needs one.
- **A non-admin is answered `403` `problem+json`; an anonymous caller keeps its
  `401`.**
- **The web reads the role in the BFF, from the access token its session holds**
  — the token the backend authorises, so the two cannot disagree. Only a
  boolean reaches the browser, to render the navigation entry; the backend
  stays the authority on every call. **The web answers everyone but an admin —
  a signed-out visitor and a signed-in non-admin alike — with its ordinary
  not-found page,** so the area is never shown to exist. An admin signs in
  first and follows the navigation entry.
- **The local stack seeds a development admin, `testadmin`,** through the
  `keycloak-seed` service beside `testuser`, which keeps showing what an
  ordinary user sees. Its password is a dev default in
  `docker-compose.dev.env`. The base compose file seeds none
  ([ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
  The Playwright suite provisions its own admin at run time rather than
  depending on `testadmin`.
- **A deployment's first admin is not decided.** The deployable definition
  imports the role and seeds no account, so a deployment has no admin until
  that is decided, and it is decided when a deployment exists. The
  [backlog](../tasks/backlog.md)'s deployment item carries it, including
  whether a grant made in Keycloak's console survives the next reconcile, which
  was not verified here.
- **A revoked role holds until the access token expires** — the realm's
  `accessTokenLifespan`, 300 s — the trade-off
  [architecture §8](../architecture.md#8-trade-offs-made-explicit) already
  accepts for sign-out.

Implementing it is [task 04](../tasks/iteration-10.5/04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)
for the realm and the backend and [task 10](../tasks/iteration-10.5/10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
for the web.

## Alternatives considered

**A client role on `kalia-backend`.** Scopes the role to the API that enforces
it, which a second resource server would want. Rejected: it needs a mapper on
each signing-in client, and a missing mapper fails the way a missing audience
does, as a refused admin, for a separation nothing here uses.

**A Keycloak group carrying the role.** Lets an operator add admins by
membership. Rejected: it adds a second object to reconcile and to get wrong
for one role held by a handful of people.

**Answering a non-admin `404` from the API.** Would hide that the area exists.
Rejected: the committed spec is public, so the routes are published anyway and
the `404` would hide nothing while making a refusal look like a missing route.

**A redirect to sign-in, or the cellar's in-page sign-in prompt, for a signed-out
visitor.** Rejected: both show a visitor that the area exists, which the
not-found page does not.

**Asking the backend whether the caller is an admin on every render.** Rejected:
a backend call on every page of every admin session, answered from the same
token the web already holds.

**Reading the role from the ID token.** Rejected: the backend authorises the
access token, so the two could disagree.

**Checking Keycloak on each admin call, to honour a revocation at once.**
Rejected: it makes every admin write depend on Keycloak being up, for a
five-minute window on a role held by a handful of people.

**Seeding one admin in the base file.** Rejected: a deployment must not inherit
a dev account ([ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).

**Granting the role in the realm's default roles for development, or to
`testuser`.** Rejected: self-registered accounts would inherit it, and
`testuser` would stop showing what an ordinary user sees.

## Consequences

- Good, because the backend learns the role from the token it already
  validates, with no call to Keycloak and no user table.
- Good, because the web and the backend read the same token, so a page cannot
  be shown that the API then refuses, or the reverse, for any reason but expiry.
- Good, because a route added under `/api/v1/admin/` is protected without
  anyone remembering to protect it.
- Bad, because a role missing from a token is a refused admin and no error, and
  the claim depends on a Keycloak default no file here states: a client given an
  explicit scope list in `realm-export.json` would drop `roles` and lock every
  admin out. A check of a real admin's token pins it.
- Bad, because an admin whose role is revoked keeps admin access for up to five
  minutes, and the web keeps showing the entry until the token is renewed.
- Bad, because the web decodes the token without checking its signature, as it
  already does for the session id, so the role it reads is a display and routing
  decision that the backend's own check must back on every call.
- Neutral, because there is no way to become the first admin in a deployment
  until that is decided; the local stack and the tests are the only places an
  admin exists.
- Neutral, because the mobile app's token carries the claim and the app ignores
  it.
- **Revisit trigger:** a second privileged role, or a permission finer than
  "admin"; a second resource server beside `kalia-backend`; a role that must
  be revoked faster than the token's lifespan; or a deployment existing.

## Evidence

Verified on 2026-11-05 against a running local stack on Keycloak 26.8.1, with
the realm as `keycloak-config` applied it, not against a hand-built token.

- A real sign-in as `testuser` through `kalia-mobile`'s authorization-code flow
  with PKCE (`signIn` in `scripts/check-keycloak-pkce-flow.mjs`) returned an
  access token with `azp: kalia-mobile`, `aud: ["kalia-backend","account"]` and
  `realm_access.roles: ["offline_access","uma_authorization","default-roles-kalia"]`.
  The claim is there with no mapper of ours, and the roles a new account
  receives are exactly the realm's default roles.
- The admin API's default client scopes for both `kalia-web` and `kalia-mobile`
  were `web-origins, acr, profile, roles, basic, email`.
- The realm's roles were `uma_authorization`, `offline_access` and
  `default-roles-kalia`: there is no `admin` role yet, which task 04 adds.
- Not verified: the same token for `kalia-web`, which needs a browser sign-in.
  Its default client scopes are the same list, which is the mechanism the claim
  depends on.
