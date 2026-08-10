# Iteration 5 — Personal beer cellar

Goal: a signed-in beer enthusiast records the individual bottles they own.

## Done when

A signed-in user can add a bottle of a catalog beer to their cellar with the
dates that bottle carries, see their cellar as one row per beer opening onto
the individual bottles beneath it, and know that nobody else can see any of it.

## Tasks

| ID | Task | Status |
|---|---|---|
| [08](iteration-5/08-clear-backend-image-trivy-waivers.md) | Clear the backend image's expiring Trivy waivers | refined |
| [01](iteration-5/01-cellar-module-and-schema.md) | `cellar` module, schema and domain rules | done |
| [02](iteration-5/02-cellar-rest-api.md) | Cellar REST API, scoped to the signed-in user | done |
| [04](iteration-5/04-functional-modules-adr.md) | Correct ADR-0023 and record the functional-modules convention | needs-refinement |
| [05](iteration-5/05-enforce-frontend-module-boundaries.md) | Enforce frontend module boundaries | needs-refinement |
| [06](iteration-5/06-feature-public-surfaces.md) | Give feature packages a public surface | needs-refinement |
| [03](iteration-5/03-cellar-frontend.md) | Cellar page and add-to-cellar from the catalog | dropped |
| [11](iteration-5/11-cellar-page.md) | Cellar page for the signed-in user | needs-refinement |
| [12](iteration-5/12-cellar-navigation.md) | Navigation between Home, Catalog and Cellar | needs-refinement |
| [13](iteration-5/13-add-bottle-to-cellar.md) | Add a bottle to the cellar from the catalog | needs-refinement |
| [14](iteration-5/14-edit-remove-bottle.md) | Edit and remove a bottle from the cellar | needs-refinement |
| [09](iteration-5/09-bottle-beer-naming.md) | Reconcile the `Bottle` / `Beer` naming across `cellar` and `catalog` | needs-refinement |
| [10](iteration-5/10-swagger-oauth2-authorization.md) | Swagger UI OAuth2 authorization for authenticated endpoints | needs-refinement |

## Maintenance

| ID | Task | Status |
|---|---|---|
| [07](iteration-5/07-drop-store-schemas.md) | Drop the empty `cart`, `ordering` and `payment` schemas | done |

Task 08 leads, ahead of the cellar work, because its deadline is external: the
`.trivyignore` waivers it removes expire **2026-08-26**, and the vulnerability
scan is deliberately diff-agnostic
([ADR-0024](../adr/0024-dependency-vulnerability-scanning.md)), so past that
date it fails on every open pull request rather than only on the one at fault.
It is maintenance work in an iteration about the cellar, and it is first anyway.

Depends on [iteration 4](iteration-4.md) task 3: the cellar cannot resolve a
current user until the backend is a resource server.

The Playwright journey this iteration originally listed as a fourth task now
belongs to the tasks that create the behaviour, per
[ADR-0026](../adr/0026-task-file-format.md) — sign in → add is an acceptance
criterion of task 13, and → edit → remove of task 14.

Task 03 bundled the cellar page, navigation, add-to-cellar and edit/remove
into one file; its own open question 8 flagged that convergence as the
iteration's largest risk, so it was split into tasks 11–14 before
refinement, and its file kept as `dropped` for history.

Task 09 was raised in review of task 01 (PR #114): whether `cellar.Bottle`
and `catalog.Beer` are named correctly relative to each other. Not a hard
blocker on tasks 02, 11, 13 or 14, but resolving it before they name REST
fields, DTOs and UI copy avoids naming those twice.

Task 10 was raised in review of task 02 (PR #120): Swagger UI has no way to
obtain a token for the cellar's now-authenticated endpoints. Not a blocker on
anything else in this iteration.
