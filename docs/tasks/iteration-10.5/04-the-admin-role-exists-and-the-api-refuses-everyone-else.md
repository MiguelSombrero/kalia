# Task 04: The admin role exists, and the API refuses everyone else

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-1

## Why

Every admin operation this iteration adds sits behind one check: is the caller
an admin. Until the role exists in the realm, reaches the backend in the token
and is enforced on the admin API, none of tasks
[05](05-an-admin-reads-the-review-queue.md)–[08](08-the-sql-moderation-script-is-retired.md)
can be tested against a caller who is not one — and the dangerous failure is
not an admin refused but a registered user admitted.

## Scope

The admin role is defined in the realm as [task 01](01-decision-who-is-an-admin.md)
decided; a self-registered account never holds it; the local stack seeds one
development admin account beside `testuser`, and the deployable definition
seeds none; the backend admits the role's holder to the admin API and answers
everyone else as task 01 decided; and the README says how to sign in as the
development admin, and that a deployment's first admin is not yet decided.

## Non-goals

- Any admin endpoint beyond what the access rule needs a test target for —
  [task 05](05-an-admin-reads-the-review-queue.md) adds the first real one.
- The web's view of the role — [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md).

## Constraints

- **This task cannot be refined before [task 01](01-decision-who-is-an-admin.md)
  is done.**
- The realm is reconciled from `keycloak/realm-export.json` on every startup
  ([ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)), and
  `make verify` fails a running realm that has drifted from the file.
- Accounts are seeded by `scripts/seed-keycloak-account.mjs` through the local
  stack's `keycloak-seed` service, idempotently on every startup; the
  deployable base carries no dev account or credential
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)),
  and a dev default belongs in `docker-compose.dev.env`, never as `:-` in the
  base.
- The public-route list is pinned by a test
  ([iteration 8 task 12](../iteration-8/12-public-routes-one-list-pinned-by-a-test.md));
  an admin route is not public and must not become reachable without a token.
- Errors are `problem+json` and every response an operation can send is in the
  spec ([iteration 8.5 task 01](../iteration-8.5/01-api-errors-complete-and-typed.md)).
- A credential the seeded admin uses is a dev-only value, never a commit
  outside the dev env file, never in a PR body.
- The role, the rule, the refusal and the development admin are
  [task 01](01-decision-who-is-an-admin.md)'s decisions, recorded in its
  Constraints.

**Decided at refinement, 2026-11-04** (product owner):

- **The Playwright suite provisions its own admin** at run time and grants it
  the role through Keycloak's admin API, as it provisions its `e2e-worker-N`
  accounts, so the suite does not depend on the local stack's `testadmin`
  seed. [Task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
  builds it, as the first Playwright test to sign in as an admin.

## Open questions

Every question was answered at refinement on 2026-11-04 — task 01's in its
Constraints, this task's above. The task moves to `refined` once task 01's ADR
is accepted and this file is checked against it.

## Acceptance criteria

- [ ] An integration test shows a token without the role refused by an admin
      endpoint, as task 01 decided, and a token with it admitted; the refusal
      test was confirmed to fail with the rule removed
- [ ] A test shows a newly self-registered account does not hold the role —
      against the realm's default roles, not only a hand-built token
- [ ] `scripts/check-compose.mjs` (or its test) fails a base compose file that
      seeds an admin account, and passes the local stack seeding one
- [ ] The development admin signs in on the running stack and its access token
      carries the role — checked by a script `make verify` runs, as
      `check-keycloak-signin.mjs` checks `testuser`
- [ ] The script above also asserts the `roles` client scope is still a default
      scope of `kalia-web` and `kalia-mobile`, since a client given an explicit
      scope list drops the claim and locks every admin out without an error
      ([ADR-0101](../../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md))
- [ ] [ADR-0028](../../adr/0028-resource-server-and-current-user.md) is amended
      to say `/api/v1/admin/**` requires the role
- [ ] `README.md` names the development admin account and says a deployment's
      first admin is not yet decided; `docs/architecture.md` §6 describes the
      role
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 — every registered
user is a non-admin, and one development admin is seeded the way `testuser` is.
