# Task 13: Keycloak has a client for the app, and the backend accepts its tokens

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-2

## Why

The realm has one client, the web's confidential `kalia-frontend`. The app
needs its own, shaped by [task 05](05-decision-mobile-authentication.md)'s
decision — public, PKCE, a `kalia://` redirect. The trap is the audience: a
client without its own `kalia-backend` audience mapper issues tokens the
backend rejects ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)),
and that shows up as a sign-in that seems to work and then fails every call,
not as a missing mapper.

## Scope

A `kalia-mobile` client in `keycloak/realm-export.json`, as task 05 decided it,
under the realm's drift check, and a backend test proving a token issued to
that client passes the audience check.

## Non-goals

- Signing in from the app — [task 14](14-sign-in-on-mobile.md).
- Redirect URIs for a real phone — [iteration 10](../iteration-10.md).

## Constraints

- [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md),
  [task 05](05-decision-mobile-authentication.md)'s decision.
- Realm configuration is applied by keycloak-config-cli and checked for drift
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)).
- Keycloak's login pages carry Kalia's theme
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md),
  [ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md));
  the client uses it.
- The issuer stays `http://localhost:8081` this iteration.
- Keycloak 26.8.1 refuses a `rootUrl` or `baseUrl` that is not `http(s)` (every
  `kalia:` spelling tried is "not a valid URL"), so `kalia-mobile` carries
  `WEB_URL` as `kalia-web` does and "Back to Application" opens the website,
  not the app. Product owner's decision, 2026-10-30; a link that opens the app
  is a [backlog](../backlog.md#mobile-client) entry.

**Decided at refinement, 2026-10-30** (product owner):

- **The client's shape is [task 05](05-decision-mobile-authentication.md)'s
  decision:** exact redirect URIs, `offline_access` with a 30-day idle
  timeout, and refresh-token rotation for this client while the web keeps
  reuse. If Keycloak can set rotation only realm-wide, this task stops and
  returns to the product owner.
- **The backend test signs its token with a test key and runs it through
  the real JWT decoder,** not the mocked one the existing security tests
  stub, so the audience check itself is exercised. That the realm's mapper
  puts `kalia-backend` in a real token is proven by the scripted PKCE flow
  among the acceptance criteria. Running Keycloak in Testcontainers was rejected as
  a new dependency.

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
was accepted:

- **Refresh-token rotation is verified first, and if it is realm-wide both
  clients keep reuse.** ADR-0095 read it from the pinned Keycloak's
  documentation and source, not from a running instance. This task checks
  whether rotation can be set for `kalia-mobile` alone. If it can, the client
  rotates and the web keeps reuse, as the ADR decides. If it cannot, both
  clients keep reuse and this task amends ADR-0095 to say so, with a revisit
  trigger: before the app is installed beyond the product owner's own phone.
  A stolen phone's refresh token then replays until sign-out or the 30-day
  idle lapse. Rotating both behind the renewal lock
  [ADR-0029](../../adr/0029-silent-token-refresh.md) rejected was declined: it
  is a change to the web's refresh, with its own risk, inside a task about a
  Keycloak client.
- **The client has one redirect URI, `kalia://auth/callback`.** Sign-out
  revokes the tokens by a direct call, so no post-logout redirect URI is
  registered.
- **The client carries a `rootUrl` and `baseUrl`,** because Keycloak's own
  pages show their "Back to Application" link only for a client that has one
  ([architecture §6](../../architecture.md)), and the realm requires email
  verification, so a user who signs up from the app leaves for their mail and
  needs a way back. What value a custom-scheme link takes there is found by
  trying it.
- **This task follows [task 08](08-workspaces-refactor.md),** which renames
  `kalia-frontend` to `kalia-web` in the same `keycloak/realm-export.json`.

## Open questions

**None.**

## Acceptance criteria

- [x] `keycloak/realm-export.json` holds the client, and the drift check is
      green against a freshly started realm
- [x] A backend test, through the real decoder, shows a token issued to
      `kalia-mobile` is accepted, and the same token without the
      `kalia-backend` audience is rejected with 401
- [x] Whether rotation can be set for `kalia-mobile` alone is checked against
      the local Keycloak and described in the PR. If it can, a `kalia-mobile`
      refresh token is refused on its second use while a `kalia-web` one is
      not. If it cannot, both clients still accept a second use and
      [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)
      is amended with the result and its revisit trigger
- [x] The realm pins the offline session idle timeout at 30 days with no
      offline maximum, and a token issued with `offline_access` to
      `kalia-mobile` carries a refresh token that outlives the SSO session's
      30-minute idle timeout — the settings read back from the admin API and
      the token exercised against the local Keycloak, described in the PR
- [x] The authorization endpoint refuses a redirect URI that is not in the
      client's list, including one under the same `kalia://` scheme, and
      refuses a request without PKCE `S256` — checked against the local
      Keycloak, and the points ADR-0095's Evidence leaves unverified (custom
      scheme matching, revoking an offline token, a disabled account's
      refresh) are each checked and the result described in the PR
- [x] A user who registers through the client's sign-in page and follows the
      emailed verification link (Mailpit, in the local stack) reaches a page
      whose "Back to Application" link opens the website, and opens the app
      themselves to sign in — followed over HTTP and described in the PR
- [x] An authorization-code flow with PKCE against the local Keycloak returns
      tokens to the `kalia://` redirect, and the access token's `aud`
      includes `kalia-backend` — verified by script, and described in the PR
- [x] `make verify` is green

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 3, on the audience
mapper.
