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

Deliberately minimal ([ADR-0056](../docs/adr/0056-branded-bilingual-keycloak-pages.md)):
`parent=keycloak.v2`, that theme's own `styles.css` kept on the list, and one
`login.css` layered after it that sets the brand colour, the cream background
and the Kalia wordmark (`resources/img/kalia-logo.svg`, shown via
`#kc-header-wrapper`). No FreeMarker, no `messages/` — Keycloak's own `en`/`fi`
bundles translate the pages, and `realm-export.json`'s
`internationalizationEnabled` / `supportedLocales` / `defaultLocale` turn them
on. The brand hex values are copied from `frontend/app/globals.css` by hand;
they are not wired to the design tokens.

**On a Keycloak image bump** (`Dockerfile` `FROM` and `keycloak-config-cli` in
`docker-compose.yml`), re-check the theme by eye: bring the stack up, open the
login and registration pages in both locales, confirm the logo, colours and
Finnish still render. `login.css` only touches keycloak.v2's documented CSS
custom properties (`--keycloak-card-top-color`, `--keycloak-bg-logo-url`) and
PatternFly globals, but nothing fails loudly if that theme's markup changes.
`frontend/e2e/keycloak-branding.spec.ts` covers the language and accessibility,
not the look.

## Checks

`scripts/check-keycloak-realm-config.mjs` asserts the running realm still
matches `realm-export.json`; `scripts/check-keycloak-signin.mjs` asserts it
accepts a sign-in. Both run in `make keycloak-check` and in CI. See
[docs/architecture.md §6](../docs/architecture.md#6-authentication-and-identity).
