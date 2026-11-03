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
- The edge answers `404` for `/admin`, meant for Keycloak's console
  ([architecture §6](../../architecture.md#6-authentication-and-identity));
  the admin route's path, and the locale redirect that serves a locale-less
  address, must not collide with it.
- This Next.js version postdates model training: request interception is
  `proxy.ts`, not `middleware.ts`, and guessing fails silently — check
  `node_modules/next/dist/docs/` first.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); the page shell is
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)'s.

## Open questions

Answered by [task 01](01-decision-who-is-an-admin.md); refined once its ADR is
accepted. Left for this task:

1. **The path:** `/[locale]/admin`, or another name that cannot meet the
   edge's `/admin` rule.
2. **The navigation entry:** its label, and whether it shows how many
   suggestions are waiting.

## Acceptance criteria

- [ ] A Playwright test signs in as the development admin and reaches the admin
      route; signs in as `testuser` and is answered as task 01 decided; and
      signed out, is sent to sign in or answered the same — each without the
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
