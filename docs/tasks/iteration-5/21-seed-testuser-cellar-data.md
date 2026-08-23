# Task 21: Pin testuser's Keycloak id and seed dev cellar data

- **Status:** dropped
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

Verifying and demoing the cellar page (task 11) against real data needs a
signed-in user who actually owns bottles. `testuser`, the only seeded
Keycloak account (`keycloak/realm-export.json`), gets a new random Keycloak
id on every `docker compose up` — `start-dev --import-realm` reimports the
realm fresh each start
([ADR-0033](../../adr/0033-keycloak-account-relinking.md) documents this
same instability, for a different reason). Both `cellar.entry.user_id` and
the frontend's session/account indexing key on that id (the JWT's `sub`
claim, [ADR-0028](../../adr/0028-resource-server-and-current-user.md)), so
there is currently no way to seed `testuser` a cellar that survives a stack
restart, and no way to test or demo the populated cellar page against a
live stack without first creating bottles by hand through the UI — which
the UI cannot do yet, since add-to-cellar (task 13) has not landed.

## Scope

A fixed `id` for `testuser` in `keycloak/realm-export.json`, and seed data
for one or more cellar entries/bottles owned by that fixed id, so a fresh
`docker compose up` gives `testuser` a non-empty, deterministic cellar out
of the box.

## Non-goals

- Any change to `testuser`'s credentials, email, or the account-relinking
  behavior [ADR-0033](../../adr/0033-keycloak-account-relinking.md) already
  established.
- Seeding data for any user other than `testuser` — no multi-user fixtures.
- Building the add-to-cellar UI (task 13) or any other product feature;
  this is dev/test infrastructure only.

## Constraints

- Confirmed working: Keycloak's realm-import format honors an explicit
  `id` on a user object, and it stays stable across a full container
  restart (`start-dev --import-realm` reimport) — verified live against
  `quay.io/keycloak/keycloak:26.7.0` while scoping this task.
- Does not change or relitigate
  [ADR-0033](../../adr/0033-keycloak-account-relinking.md)'s decision —
  that ADR rejected pinning `testuser`'s id as a fix for
  `OAuthAccountNotLinked` specifically, because it does not close the
  production-side gap a real Keycloak user delete-and-recreate would still
  hit, not because pinning it is wrong. `allowDangerousEmailAccountLinking`
  stays as the fix for that problem; this task's pinned id is additive.
- `cellar.entry`/`cellar.bottle` have no foreign key to a users table
  (cross-module reference by id only,
  `backend/src/main/resources/db/migration/cellar/V005__cellar_schema.sql`)
  — seeding is a matter of inserting rows with the fixed id, not
  registering a user anywhere in the backend's own schema.

## Open questions

- **Constraints and trade-offs:** should the cellar seed data be an
  unconditional Flyway migration, mirroring
  `backend/src/main/resources/db/migration/catalog/V004__catalog_seed_data.sql`
  (simplest, matches existing precedent, but ships to every environment,
  including a real deployment once one exists) — or environment-gated (a
  dev-profile-only loader, or a script kept outside Flyway's migration
  chain), so a fabricated user's fake cellar never reaches production data?
- **Domain and data model:** how many entries/bottles, and what mix —
  enough to exercise the cellar page's own acceptance criteria (task 11:
  multiple bottles of the same beer with different dates, a bottle with no
  dates, more than one beer) without over-specifying content nobody asked
  for?
- **Terminology consistency:** does the fixed `testuser` id get documented
  anywhere a future contributor doing dev-seeding work would look (e.g.
  `backend/README.md` or `frontend/README.md`), so its value is
  discoverable rather than something to grep
  `keycloak/realm-export.json` for?

## Acceptance criteria

- [ ] The seeded cellar data exists for the fixed `testuser` id after a
      fresh database — a backend integration test (`*IT`, Testcontainers)
      asserting `cellar.entry`/`cellar.bottle` rows for that id
- [ ] A clean `docker compose up --build` gives `testuser` the same
      Keycloak id on every run — verified by comparing the Keycloak admin
      API's reported user id across two consecutive
      `docker compose down && up` cycles
- [ ] After a clean `docker compose up --build`, signing in as `testuser`
      and opening `/en/cellar` shows a non-empty cellar with no manual
      setup step — verified in a browser

## Notes

Raised during review of [task 11](11-cellar-page.md)
([PR #158](https://github.com/MiguelSombrero/kalia/pull/158)): verifying
the cellar page's populated state against a real running stack needed
cellar data for `testuser`, and there was no way to seed it
deterministically.

**Dropped (2026-08-23).** Product-owner decision: with add-to-cellar (task
13) and edit/remove (task 14) both now shipped, the UI itself can populate
`testuser`'s cellar by hand in seconds, closing the gap this task was
scoped to fix. A fixed Keycloak id and dedicated seed data are not worth
maintaining as dev/test infrastructure on top of that. This file is kept,
`dropped`, as the historical record of the concern and why it no longer
applies.
