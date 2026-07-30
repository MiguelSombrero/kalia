# Iteration 5 — Personal beer cellar

Goal: a signed-in beer enthusiast maintains the catalog of beers they own.

## Done when

A signed-in user can add a beer from the catalog to their cellar and see its
age and quantity; another user cannot see it.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-5/01-cellar-module-and-schema.md) | `cellar` module, schema and domain rules | refined |
| [02](iteration-5/02-cellar-rest-api.md) | Cellar REST API, scoped to the signed-in user | refined |
| [03](iteration-5/03-cellar-frontend.md) | Cellar page and add-to-cellar from the catalog | refined |

Depends on [iteration 4](iteration-4.md) task 3: the cellar cannot resolve a
current user until the backend is a resource server.

The Playwright journey this iteration originally listed as a fourth task now
belongs to the task that creates the behaviour, per
[ADR-0026](../adr/0026-task-file-format.md) — sign in → add → edit → remove is
an acceptance criterion of task 03.
