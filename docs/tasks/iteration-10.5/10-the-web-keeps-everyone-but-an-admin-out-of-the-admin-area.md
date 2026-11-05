# Task 10: The web keeps everyone but an admin out of the admin area

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-1

## Why

The admin page is visible only to a user with the admin role. The backend
already refuses a non-admin's admin calls after
[task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md), but a
web that renders the page shell, or shows the navigation entry, before the API
refuses is a page that leaks what exists and fails in front of the user. The
web has no notion of a role at all: its session holds the tokens, and every
page treats every signed-in user alike.

This task is the plumbing every admin page stands on, kept apart from
[task 11](11-design-the-admin-review-page.md)'s design so a reviewer of either
sees one thing.

## Scope

The web learns whether the signed-in user is an admin, as
[ADR-0101](../../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)
decides; the admin route `/[locale]/admin` answers a non-admin and a signed-out
visitor with the web's ordinary not-found page, before rendering anything of
the page; and the navigation offers the admin area to an admin alone. The
route exists with a placeholder the design task replaces, and this task builds
the Playwright suite's admin account that every later admin spec signs in as.

## Non-goals

- The admin page's content — [task 11](11-design-the-admin-review-page.md).
- Any admin surface in the mobile app.

## Constraints

- Follows [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md),
  whose realm role the Playwright admin is granted.
- Tokens stay on the server ([ADR-0003](../../adr/0003-bff-pattern.md),
  [ADR-0030](../../adr/0030-per-session-token-storage.md)); a role read from
  the access token is read in the BFF, and a decision made in the browser is
  never the authority.
- The edge's `404` for `/admin` applies to Keycloak's origin only
  ([architecture §6](../../architecture.md#6-authentication-and-identity)); the
  web's origin serves the admin route.
- The role is read by decoding the access token the session holds, without
  checking its signature, as the web already does for the session id; it is a
  display and routing decision, so the backend's own check backs every call
  (ADR-0101's Consequences). A signed-out visitor is not redirected to sign
  in: both that and a non-admin get the not-found page, so the route never
  shows the area exists.
- The answer depends on the session, so the admin route is rendered per
  request and never statically rendered or cached for another visitor. The
  placeholder carries no admin data.
- This Next.js version postdates model training: request interception is
  `proxy.ts`, not `middleware.ts`, and guessing fails silently — check
  `node_modules/next/dist/docs/` first.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); the page shell is
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)'s.
- How the web learns the role, and that a signed-out visitor and a signed-in
  non-admin are both answered the not-found page, are decided in ADR-0101
  ([task 01](01-decision-who-is-an-admin.md)). The Playwright suite's own admin
  is decided in [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)'s
  Constraints and built here, in `web/e2e/support/keycloakAccount.ts` beside
  the `e2e-worker-N` accounts, so tasks [11](11-design-the-admin-review-page.md),
  [12](12-design-the-contributors-notifications.md) and
  [20](20-an-admin-removes-an-approved-beer-from-its-page.md) sign in through
  one helper.

**Decided at refinement, 2026-11-04** (product owner; the second pass on
2026-11-05 checked this file against ADR-0101 and changed no decision):

- **The path is `/[locale]/admin`.**
- **The navigation entry reads "Admin" / "Ylläpito" and shows no count,** so
  an admin's page render makes no extra backend call.

## Open questions

**None.**

## Acceptance criteria

- [ ] A Playwright test signs in as an admin the suite provisions and reaches
      the admin route; signs in as an ordinary worker account, and visits
      signed out, and each time is answered status `404` and the not-found
      page — without the admin page's content in the response — in both
      locales
- [ ] A component test shows the navigation entry, reading "Admin" and
      "Ylläpito" and showing no count, to an admin and to nobody else — a
      signed-out visitor, a signed-in non-admin and a session with no role
      claim
- [ ] A test shows the admin decision is made server-side from the session: a
      request that carries an admin hint of its own (a cookie, a header, a
      query parameter) but a non-admin session is answered the not-found page,
      and the props that reach the browser hold a boolean and no token
- [ ] The route is reachable through the edge — Playwright run against the edge
      origin
- [ ] `npm test`, `npm run lint` and `npm run build` are green, and
      `make verify-fast`

## Notes

Provenance: the product owner's brief for iteration 10.5 — "the page is only
visible to ADMIN role users".
