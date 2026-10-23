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
| The mark | `resources/img/kalia-mark.svg`, a copy of `frontend/app/icon.svg` |
| The wordmark and the link home | the realm's `displayNameHtml` in `realm-export.json` |

**Changing a colour.** Each one is declared once at the top of `login.css` as
`--kalia-color-<name>`, a copy of `--color-<name>` in
`frontend/app/globals.css`; everything else refers to those. Change the app's
token and the copy together. `scripts/check-keycloak-theme.mjs` fails on a
copy that no longer matches, on a colour literal anywhere else in the file,
and on a mark that differs from the app's. A new colour gets a
`--kalia-color-*` name that the app's `@theme` block also has.

**On a Keycloak image bump** (`Dockerfile` `FROM` and `keycloak-config-cli` in
`docker-compose.yml`), run `frontend/e2e/keycloak-branding.spec.ts` and
`frontend/e2e/keycloak-errors.spec.ts`, and look at
the four pages at 375 and 1280 in both locales. The branding spec checks each page's
language, the lockup and its mark, the column's width and position, the hidden
language menu, sideways scroll, the axe scan and computed contrast. What it
cannot judge is whether the page still looks like Kalia: a keycloak.v2 markup
change that drops a style without moving the column passes it.

## Checks

`scripts/check-keycloak-realm-config.mjs` asserts the running realm still
matches `realm-export.json`; `scripts/check-keycloak-signin.mjs` asserts it
accepts a sign-in, and again after Keycloak's container is recreated, which
proves accounts live in Postgres rather than the container. Both run in
`make keycloak-check` and in CI, whenever a push touches Keycloak's inputs.
`scripts/check-keycloak-theme.mjs` needs no stack: it holds the theme's
colours and mark to the app's, in `make check`, hence CI. See
[docs/architecture.md §6](../docs/architecture.md#6-authentication-and-identity).
