# ADR-0095: The mobile app signs in as a public PKCE client, holds an offline token and calls Spring directly through the edge

- **Status:** accepted
- **Date:** 2026-10-30

## Context

Everything Kalia built for authentication assumes a browser behind a BFF. The
web client is a confidential Keycloak client whose secret lives in the Next.js
server, its tokens sit in Valkey ([ADR-0030](0030-per-session-token-storage.md)),
the BFF renews them ([ADR-0029](0029-silent-token-refresh.md)) and Keycloak
ends its session by back-channel logout ([ADR-0031](0031-backchannel-logout.md)).
The Expo app of [iteration 9](../tasks/iteration-9.md) shares none of that. It
cannot keep a secret, it holds its own tokens, and Keycloak cannot call a phone,
so the app has to renew its own tokens and end its own session when a renewal
fails.

Two questions were deferred to this decision on purpose.
[Iteration 8.5 task 13](../tasks/iteration-8.5/13-sessions-and-stack-credentials-hardened.md)
left refresh-token rotation to be chosen for both clients at once, and
[ADR-0029](0029-silent-token-refresh.md) records the web's exposure until then.
And the quality backlog's COULD-65 noted that an access token outlives sign-out
by up to its lifespan: harmless while the BFF throws its copy away, not once a
lost phone holds one.

The backend is a resource server that checks signature, `iss` and `aud`
([ADR-0028](0028-resource-server-and-current-user.md)), so a token the realm
issues to a new client is rejected unless that client also carries a
`kalia-backend` audience mapper. Realm configuration is applied by
keycloak-config-cli under a drift check
([ADR-0054](0054-keycloak-config-cli-realm-management.md)).

## Decision

**The mobile app signs in through the system browser as a public Keycloak
client, `kalia-mobile`, using Authorization Code with PKCE and no secret; it
keeps an offline token in the device's secure storage, and it calls the Spring
API directly through the edge proxy.**

- **No mobile BFF.** The app sends its access token to the Spring API on the
  edge's backend port, the one public entry, so the app's anonymous calls are
  bounded the way the web's are
  ([ADR-0090](0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
  Spring stays the resource server of [ADR-0028](0028-resource-server-and-current-user.md)
  and needs no new route for the app. The web is unchanged: the browser still
  reaches the API only through Next.js.
- **The client is public, with PKCE, a standard-flow-only grant and exactly
  listed redirect URIs.** Each is the full string the app registers for its
  callback, and none is a wildcard over the app's URL scheme — a pattern such as
  `kalia://*` is the usual open-redirect foothold, because any other app that
  registers the scheme could receive the code. The strings themselves are
  [task 13](../tasks/iteration-9/13-keycloak-mobile-client.md)'s to write and
  [iteration 10](../tasks/iteration-10.md)'s to extend for a real phone.
  `kalia-mobile` carries **its own `kalia-backend` audience mapper**: the mapper
  on `kalia-frontend` does not apply to it, and a token without the audience
  fails ADR-0028's check on every call, which presents as a sign-in that works
  and then a backend that refuses everything.
- **The session is an offline token (the `offline_access` scope) that lapses
  after 30 days unused and has no maximum while it is in use.** The realm's
  offline idle timeout is set to 30 days explicitly, as ADR-0029 pins the other
  lifetimes rather than inheriting them, and the offline maximum is left off.
  The access token is the realm's 300 seconds. The app trades the refresh
  token for a new access token itself, and a refresh that Keycloak answers with
  `invalid_grant` ends the app's session — the mobile counterpart of
  ADR-0029's rule, since nothing else will tell the app.
- **Mobile refresh tokens rotate; the web keeps reuse.** Reuse stays for the web
  for the reason [ADR-0029](0029-silent-token-refresh.md) gives: the BFF renews
  without a lock, so two tabs refreshing at once must both succeed. A phone has
  one writer, and a token read off a stolen device then replays only until the
  rightful app next refreshes. **Contingency:** at the pinned Keycloak,
  rotation reads only realm settings (see Evidence). If it cannot be set for
  `kalia-mobile` alone, [task 13](../tasks/iteration-9/13-keycloak-mobile-client.md)
  stops and returns the choice to the product owner rather than rotating for
  the web too, which would need ADR-0029's rejected renewal lock.
- **Sign-out forgets the tokens on the device at once, then revokes them at
  Keycloak when there is a connection.** Offline, sign-out still completes on
  the device and the server-side session lapses at its idle timeout — for an
  offline session that is the 30 days above, not the 30 minutes of a browser
  session. Forgetting the tokens first is what makes the offline case safe to
  accept: the copy that could be used is gone from the device.
- **An access token keeps working for up to its 5-minute lifespan after
  sign-out or after an account is disabled; this is accepted** as a trade-off
  ([architecture §8](../architecture.md#8-trade-offs-made-explicit)) and
  COULD-65 is retired. The backend does not introspect and the realm does not
  shorten the mobile lifespan.
- **Sign-in happens in the system browser**, as the IETF's OAuth guidance for
  native apps (RFC 8252) expects, and sign-up is reached from Keycloak's own
  sign-in page exactly as on the web
  ([ADR-0055](0055-self-registration-via-keycloak.md)). The app builds no
  credential or registration form of its own.
- **Tokens are kept in the platform's secure storage** — the Keychain on iOS,
  the Keystore on Android — never in plain app storage.
- **No OAuth library is chosen here.** It is a new dependency, and the version
  is asked in [task 14](../tasks/iteration-9/14-sign-in-on-mobile.md).

## Alternatives considered

**A mobile BFF.** A third service holding the app's tokens server-side would
keep them off the device. Rejected: the reason for the web BFF
([ADR-0003](0003-bff-pattern.md)) is that a browser has no safe place to keep a
token, and a phone has one. The BFF would also have to authenticate the app to
itself, which is the same problem one hop further on, and it would add a service
to run, a session store to size, and a hop on every request over a mobile
network. A service that does nothing but forward calls is also more code to
keep in step with the API than the API's own contract
([ADR-0093](0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

**A confidential client whose secret ships in the app.** Rejected: a secret in
a binary an attacker can unpack is not a secret, and it would claim a protection
the client does not have.

**An embedded web view for sign-in.** The app would draw its own login screen.
Rejected: the app would see the password, the browser's saved credentials and
single sign-on would not apply, and the user could not check where they typed it.

**A wildcard redirect such as `kalia://*`.** One entry would survive any change
of path. Rejected: it is the open-redirect foothold the exact list exists to
close, for the saving of editing a realm file when the callback changes.

**A longer regular session instead of an offline token.** A phone user stays
signed in for months, so the regular session's idle and maximum would be raised.
Rejected: they are realm settings, and ADR-0029 caps the web's local session to
them, so raising them lengthens the web's session too. Keycloak's per-client
session overrides are documented as shorter-than-the-realm values, so a client
cannot lengthen its own.

**Reuse of refresh tokens for the mobile client too.** Nothing to set and one
behaviour to explain. Rejected: the token sits on a device that can be lost,
and under reuse a copy replays beside its owner for the whole session without
either noticing.

**Rotating for both clients at once, behind the renewal lock ADR-0029
rejected.** One setting, and the web's exposure closes with the mobile one.
Rejected for now as the web's cost to carry: a lock on every renewal, in order
to fix a window the web already accepted. It is one way out if rotation turns
out to be realm-wide, and that choice is the product owner's.

**Shortening the mobile access token, or introspecting on sensitive writes,
to close COULD-65.** A shorter lifespan narrows the window but never closes it
and adds a refresh round trip per interval; introspection closes it for the
writes it covers, at a Keycloak call and a new dependency of the backend on
Keycloak's availability per request, which ADR-0028 chose to avoid. The window is
five minutes and what a token reaches is a user's own cellar and profile;
accepted instead.

**Plain app storage for tokens.** Rejected: readable by anything with a backup or
a rooted device, for no saving.

## Consequences

- Good, because the app needs no new service and the edge's limits already
  cover its anonymous traffic.
- Good, because a user stays signed in for as long as they use the app,
  without lengthening the web's session.
- Good, because sign-in and sign-up reuse Keycloak's own pages, branded and
  bilingual ([ADR-0056](0056-branded-bilingual-keycloak-pages.md)), and Kalia
  writes no credential screen.
- Bad, because [ADR-0003](0003-bff-pattern.md)'s "no CORS surface" and "the
  Spring API is not exposed publicly" are no longer system-wide: the API is
  reachable by a client that holds its own token. It is reached through the edge,
  and Spring checks every token, but a stolen mobile token is now a stolen
  bearer credential of the kind the BFF existed to keep out of reach.
- Bad, because a session with no maximum has no end while it is used: a token
  in the hands of someone who keeps refreshing it lives indefinitely, until the
  user signs out or an administrator revokes the session.
- Bad, because an access token outlives sign-out and an account disable by up to
  five minutes, so a lost phone is usable for that long after the account is
  closed.
- Bad, because a rotated refresh token is single-use: a refresh whose response is
  lost leaves the app holding a spent token and signs the user out. The app must
  store the new token before it uses the new access token.
- Bad, because offline sign-out leaves a server-side session that lapses only at
  its 30-day idle timeout. The device no longer holds the token, so the exposure
  is a copy taken before sign-out.
- Neutral, because the mobile client is public and holds no secret, so unlike the
  Swagger client it may live in the realm file the deployable stack imports; that
  qualifies [ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)'s
  "pins no public client", which was written for Swagger.
- Neutral, because the app no longer shares the web's absolute cap of
  `ssoSessionMaxLifespan`; the two clients now have different session lifetimes
  on purpose.
- **Revisit trigger:** rotation turning out to be realm-wide, which returns the
  choice to the product owner; a deployment that changes the issuer or the
  redirect URIs ([iteration 10](../tasks/iteration-10.md)); or a feature where a
  five-minute window after a disable is not acceptable, which would bring
  introspection back.

## Evidence

Keycloak is pinned to 26.8.1 in `keycloak/Dockerfile`. The points below were
read from the Server Administration Guide sources at the `26.8.1` tag
(`docs/documentation/server_admin/topics/`) and from the token manager's source
(`services/src/main/java/org/keycloak/protocol/oidc/TokenManager.java`) on
2026-10-30. They were read through a page-fetch tool that summarises, not by
running Keycloak, so [task 13](../tasks/iteration-9/13-keycloak-mobile-client.md)
re-checks each against the running realm.

- **Offline tokens** (`sessions/offline.adoc`): an offline token does not expire
  with the SSO session's idle or maximum; it must be used at least once every 30
  days, or within the Offline Session Idle value when that is set; with Offline
  Session Max Limited on, it expires after 60 days even in use; with Revoke
  Refresh Token on, each offline token works once. The scope is `offline_access`,
  the user needs the realm role of that name, and the optional client scope
  carries it by default.
- **Where the timeouts live** (`sessions/timeouts.adoc`): Offline Session Idle,
  Offline Session Max Limited, Offline Session Max, SSO Session Idle/Max and
  Access Token Lifespan are realm settings. That page lists three per-client
  overrides: Client Session Idle, Client Session Max and Client Offline Session
  Max. The client Advanced settings page
  (`clients/oidc/con-advanced-settings.adoc`) lists two more, Client Offline
  Session Idle and Access Token Lifespan. The pages disagree about whether
  offline idle can be set per client; this ADR does not need it, because the
  web uses no offline token and the realm value is the one set.
- **Rotation is a realm setting.** Revoke Refresh Token is on the realm's Tokens
  tab (`timeouts.adoc`), no client setting names it
  (`con-advanced-settings.adoc`), and `TokenManager` gates rotation on
  `realm.isRevokeRefreshToken()` and the reuse limit on
  `realm.getRefreshTokenMaxReuse()`, reading no client attribute or client policy
  in those paths. This is what the contingency in Decision rests on: at 26.8.1
  rotation for `kalia-mobile` alone has no setting to enable.
- **Redirect URIs** (`clients/oidc/con-basic-settings.adoc`): matching is exact and
  case-sensitive; a wildcard is allowed at the end of a pattern; a bare `*`
  matches any `http` or `https` URI and is not for production. The page says
  nothing about custom URL schemes.
- **Revocation and logout** (`securing_apps/oidc-layers`): the revocation endpoint
  accepts refresh and access tokens, and revoking a refresh token also revokes the
  client's consent. The docs do not say whether it ends the user session. A
  redirect to the logout endpoint ends the active user session; offline tokens are
  documented as usable after the user logs out.

**Not verified, so task 13 or 14 must check it against the running Keycloak:**
that revoking an offline refresh token leaves no usable session behind;
that a custom-scheme redirect matches exactly as the docs state for `http`;
that PKCE with `S256` is enforced for `kalia-mobile` rather than merely
accepted; that a disabled account's refresh is refused; and whether the
realm-wide Offline Session Idle can be set without touching the web.
