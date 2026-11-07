# Keycloak

The realm and the login theme for Kalia's identity provider. Why Keycloak owns
authentication and self-registration: [ADR-0025](../docs/adr/0025-authjs-valkey-adapter.md),
[ADR-0055](../docs/adr/0055-self-registration-via-keycloak.md). How the realm
file is applied and kept from drifting:
[ADR-0054](../docs/adr/0054-keycloak-config-cli-realm-management.md).

## Layout

| Path | What |
|---|---|
| `Dockerfile` | `quay.io/keycloak/keycloak` + `kc.sh build`, then the `kalia` theme copied to `/opt/keycloak/themes/` |
| `realm-export.json` | the whole realm — clients, SMTP, registration, i18n, `loginTheme`; every value is a literal or a `$(env:…)` placeholder, no credential ([ADR-0054](../docs/adr/0054-keycloak-config-cli-realm-management.md)) |
| `realm-swagger.json` | the Swagger UI's client, in the dev overlay only: `docker-compose.override.yml` hands it to keycloak-config-cli beside `realm-export.json` |
| `themes/kalia/login/` | the login theme ([ADR-0056](../docs/adr/0056-branded-bilingual-keycloak-pages.md)) |

## The `kalia` login theme

`parent=keycloak.v2`, that theme's own `styles.css` kept on the list, one
`login.css` layered after it, and one script ([ADR-0056](../docs/adr/0056-branded-bilingual-keycloak-pages.md),
laid out by [ADR-0074](../docs/adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)).
No FreeMarker. Keycloak's own `en`/`fi` bundles translate the pages, and
`messages/` overrides one key ([ADR-0061](../docs/adr/0061-brute-force-lockout-is-temporary-and-disclosed.md)).

| Piece | Where |
|---|---|
| Palette, type, corners, edges, alerts | `login.css` `:root`: PatternFly's and keycloak.v2's documented custom properties |
| The open column and its top alignment | `login.css` `.kalia-login` / `.kalia-container`, classes added through `theme.properties`' `kcLogin` / `kcLoginContainer` keys |
| The lockup, title, link heights, button labels, hidden language menu | `login.css`, through Keycloak's `kc-` element ids |
| The error sign on field errors and error alerts | `login.css` `.kalia-field-error` / `.kalia-alert`, classes added through `theme.properties`' `kcInputErrorMessageClass` / `kcAlertClass` keys; the cross is `resources/img/error-cross*.svg`, used as a mask |
| Each field's `aria-describedby` to its error line | `resources/js/field-errors.js`, loaded through `theme.properties`' `scripts` key |
| The mark | `resources/img/kalia-mark.svg`, a copy of `web/app/icon.svg` |
| The wordmark and the link home | the realm's `displayNameHtml` in `realm-export.json` |

**Changing a colour.** Each one is declared once at the top of `login.css` as
`--kalia-color-<name>`, a copy of `--color-<name>` in
`web/app/globals.css`; everything else refers to those. Change the app's
token and the copy together. `scripts/check-keycloak-theme.mjs` fails on a
copy that no longer matches, on a colour literal anywhere else in the file,
and on a mark that differs from the app's. A new colour gets a
`--kalia-color-*` name that the app's `@theme` block also has.

**On a Keycloak image bump** (`Dockerfile` `FROM` and `keycloak-config-cli` in
`docker-compose.base.yml`), run `web/e2e/keycloak-branding.spec.ts` and
`web/e2e/keycloak-errors.spec.ts`, and look at
the four pages at 375 and 1280 in both locales. The branding spec checks each page's
language, the lockup and its mark, the column's width and position, the hidden
language menu, sideways scroll, the axe scan and computed contrast. What it
cannot judge is whether the page still looks like Kalia: a keycloak.v2 markup
change that drops a style without moving the column passes it.

## Checks

`scripts/check-keycloak-realm-config.mjs` asserts the running realm still
matches `realm-export.json`; `scripts/check-keycloak-signin.mjs` asserts it
accepts a sign-in, and again after Keycloak's container is recreated, which
proves accounts live in Postgres rather than the container;
`scripts/check-keycloak-pkce-flow.mjs` signs in as `kalia-mobile` and asserts
the audience and the registration [ADR-0095](../docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md) promises;
`scripts/check-keycloak-admin.mjs` asserts the `admin` role reaches
`testadmin`'s `kalia-web` token and no one else's, never `kalia-mobile`'s, and,
with `--backend`, that the API refuses the app's token at `/api/v1/admin/**`.
All four run in `make keycloak-check` and in CI, whenever a push touches
Keycloak's inputs.
`scripts/check-keycloak-theme.mjs` needs no stack: it holds the theme's
colours and mark to the app's, in `make check`, hence CI. See
[docs/architecture.md §6](../docs/architecture.md#6-authentication-and-identity).

## Realm settings that fail silently

All of these are in `realm-export.json` under the drift check
([ADR-0054](../docs/adr/0054-keycloak-config-cli-realm-management.md)).

- **`kalia-web` and `kalia-mobile` carry `rootUrl` and `baseUrl`.** Keycloak
  renders its error page's "Back to Application" link only for a client with a
  `baseUrl`; without one the page is a dead end, reached from an emailed link.
  Keycloak accepts only an `http` or `https` address there, so `kalia-mobile`'s
  link opens the website, not the app.
- **`kalia-mobile`'s one redirect URI is `kalia://auth/callback`,** exact and
  never a wildcard, with PKCE `S256` required and its own `kalia-backend`
  audience mapper, because the backend rejects a token without it
  ([ADR-0095](../docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- **An offline session lapses after 30 days unused** and has no maximum while
  in use (`offlineSessionIdleTimeout`, `offlineSessionMaxLifespanEnabled`).
  Refresh tokens are reused, not rotated (`revokeRefreshToken` is realm-wide, so
  rotating the app's would rotate the web's)
  ([ADR-0029](../docs/adr/0029-silent-token-refresh.md)).
- **Lockout is temporary:** `bruteForceProtected`, 10 failures
  (`failureFactor`), a 60-second first wait that doubles to a 15-minute cap,
  the count forgotten after 12 hours
  ([ADR-0061](../docs/adr/0061-brute-force-lockout-is-temporary-and-disclosed.md)).
- **Mail is Keycloak's alone,** through `$(env:KEYCLOAK_SMTP_*)` placeholders:
  Mailpit in the dev overlay, a real sender in a deployment.
- **`kalia-mobile` lists its client scopes** (default `web-origins`, `acr`,
  `profile`, `basic`, `email`; optional `offline_access`), with no `roles`. A
  client with no list inherits the realm's, `roles` included, and `roles` is what
  writes the admin role into a token, so the app's offline refresh token would
  carry it for as long as it is refreshed. The audience does not come from that
  scope, so leaving it out costs the token nothing the backend reads. `kalia-web`
  keeps no list on purpose: it must keep `roles`, or every admin is refused
  without an error. Add a scope the app needs to both lists, never `roles`
  ([ADR-0101](../docs/adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
- **The `admin` realm role** is granted to no one and is not a default role;
  the local stack seeds `testadmin` with it
  ([ADR-0101](../docs/adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
