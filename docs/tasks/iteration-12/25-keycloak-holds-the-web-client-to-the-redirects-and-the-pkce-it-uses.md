# Task 25: Keycloak holds the web client to the redirects and the PKCE it uses

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

`kalia-mobile` is registered as tightly as Keycloak allows: one exact redirect
and `pkce.code.challenge.method: S256`
([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
`kalia-web` in `keycloak/realm-export.json` is registered loosely, in two ways:

- **Wildcard redirects.** Its `redirectUris` and `post.logout.redirect.uris` are
  `WEB_URL/*`. The app uses two callback paths
  (`/api/auth/callback/keycloak`, `/api/auth/callback/keycloak-register`) and
  `/` after sign-out (`web/features/auth/actions.ts`). A wildcard accepts any
  path on the origin, so a leak on that origin (an open redirect, a reflected
  page) can collect an authorization code that three exact paths would refuse
  (COULD-159).
- **PKCE not required.** Auth.js sends PKCE, but the client sets nothing, so a
  request without it is accepted. The protection holds only while the client
  remembers to send it (COULD-160).

Both are one realm file and one check, and the phone's cellar makes the account
behind the sign-in worth more than a catalog reader's, since it now holds a
user's data.

## Scope

- `kalia-web`'s redirect URIs and post-logout redirect URIs name exactly the
  paths the app uses, with no wildcard.
- `kalia-web` requires PKCE with `S256`, as `kalia-mobile` does.
- The realm checks fail a wildcard redirect or a missing PKCE requirement on
  either client, and a running stack refuses an authorization request that
  breaks either.

## Non-goals

- Password guessing per address, which is a separate decision
  (COULD-158, still in the [quality backlog](../quality-backlog.md)).
- Changing the mobile client, or the token lifetimes
  ([ADR-0029](../../adr/0029-silent-token-refresh.md)).
- The edge's rate limits
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).

## Constraints

- **A realm change reaches the running realm through `keycloak-config-cli`,**
  and the drift check compares the realm to the file
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)); a
  value changed only in the admin console is the failure that check exists for.
- **The wildcard is replaced by what the app really uses.** Every redirect the
  web sends, including a locale-prefixed return path and the registration
  callback, is found by running the flows, not by reading the code once; a
  missed path fails sign-in silently for that flow.
- **Auth.js's PKCE is verified, not assumed:** the web's end-to-end sign-in,
  registration and sign-out run against the tightened realm.
- A `$(env:WEB_URL)` placeholder resolves the way the config service resolves
  it; the checks read the running realm, not the file
  (`scripts/check-keycloak-realm-config.mjs`).

## Open questions

- **Integrations.** Whether any flow returns to a path beyond the three —
  email verification, password reset, the account page's "Back to application"
  link — and so needs its own entry.
- **Edge cases.** The `webOrigins` list, which is already exact, and whether a
  deployed `WEB_URL` with a path prefix changes any of the three paths.
- **Non-functional.** Whether `post.logout.redirect.uris` keeps a locale-prefixed
  home (`/fi`, `/en`) as well as `/`.

## Acceptance criteria

- [ ] A test of the realm file fails for a wildcard in either client's
      `redirectUris` or `post.logout.redirect.uris`, and for a missing
      `pkce.code.challenge.method` on `kalia-web`. It failed before the change
- [ ] Against the running stack, an authorization request from `kalia-web`
      without a `code_challenge` is refused, and one with a redirect URI outside
      the registered paths is refused
- [ ] The web's Playwright sign-in, registration and sign-out flows pass against
      the tightened realm, and the pull request names the redirect paths they
      exercised
- [ ] `make keycloak-check` reports no drift between the file and the running
      realm
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-159 and COULD-160.
