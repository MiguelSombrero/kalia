# Task 10: The web keeps everyone but an admin out of the admin area

- **Status:** needs-refinement
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
[task 01](01-decision-who-is-an-admin.md) decided; the admin route answers a
non-admin and a signed-out visitor as task 01 decided, before rendering
anything of the page; and the navigation offers the admin area to an admin
alone. The route exists with a placeholder the design task replaces.

## Non-goals

- The admin page's content — [task 11](11-design-the-admin-review-page.md).
- Any admin surface in the mobile app.

## Constraints

- **This task cannot be refined before [task 01](01-decision-who-is-an-admin.md)
  is done**, and follows [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md).
- Tokens stay on the server ([ADR-0003](../../adr/0003-bff-pattern.md),
  [ADR-0030](../../adr/0030-per-session-token-storage.md)); a role read from
  the access token is read in the BFF, and a decision made in the browser is
  never the authority.
- The edge's `404` for `/admin` applies to Keycloak's origin only
  ([task 01](01-decision-who-is-an-admin.md)'s Constraints); the web's origin
  serves the admin route.
- This Next.js version postdates model training: request interception is
  `proxy.ts`, not `middleware.ts`, and guessing fails silently — check
  `node_modules/next/dist/docs/` first.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); the page shell is
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)'s.
- How the web learns the role, and that a signed-out visitor and a signed-in
  non-admin are both answered the not-found page, are [task 01](01-decision-who-is-an-admin.md)'s
  decisions; the Playwright suite's own admin is
  [task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)'s,
  and is built here.

**Decided at refinement, 2026-11-04** (product owner):

- **The path is `/[locale]/admin`.**
- **The navigation entry reads "Admin" / "Ylläpito" and shows no count,** so
  an admin's page render makes no extra backend call.

## Open questions

Every question was answered at refinement on 2026-11-04 — task 01's in its
Constraints, this task's above. The task moves to `refined` once task 01's ADR
is accepted and this file is checked against it.

## Acceptance criteria

- [ ] A Playwright test signs in as an admin the suite provisions and reaches
      the admin route; signs in as an ordinary worker account, and visits
      signed out, and each time is answered the not-found page — without the
      page's content in the response
- [ ] A component test shows the navigation entry to an admin and to nobody
      else
- [ ] A test shows the admin decision is made server-side from the session,
      not from anything the browser sends
- [ ] The route is reachable through the edge — Playwright run against the edge
      origin
- [ ] `npm test`, `npm run lint` and `npm run build` are green, and
      `make verify-fast`

## Notes

Provenance: the product owner's brief for iteration 10.5 — "the page is only
visible to ADMIN role users".
