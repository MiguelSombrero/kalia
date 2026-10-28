# Task 13: Keycloak has a client for the app, and the backend accepts its tokens

- **Status:** needs-refinement
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

- [Task 05](05-decision-mobile-authentication.md)'s ADR.
- Realm configuration is applied by keycloak-config-cli and checked for drift
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)).
- Keycloak's login pages carry Kalia's theme
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md),
  [ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md));
  the client uses it.
- The issuer stays `http://localhost:8081` this iteration.

## Open questions

1. **Exact redirect URIs**, or a wildcard under `kalia://`? Wildcards are the
   usual open-redirect foothold.
2. **Is refresh-token rotation a realm setting or per client** — and so does
   this task change the web's behaviour too? Derived from task 05's answer.
3. **How is the backend test's token produced** — from a real Keycloak in
   Testcontainers, or signed by a test key the way the existing security tests
   do it?

## Acceptance criteria

- [ ] `keycloak/realm-export.json` holds the client, and the drift check is
      green against a freshly started realm
- [ ] A backend test shows a token issued to `kalia-mobile` is accepted, and
      the same token without the `kalia-backend` audience is rejected with 401
- [ ] An authorization-code flow with PKCE against the local Keycloak returns
      tokens to the `kalia://` redirect — verified by script or by hand, and
      described in the PR
- [ ] `make verify` is green

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 3, on the audience
mapper.
