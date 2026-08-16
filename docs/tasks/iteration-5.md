# Iteration 5 — Personal beer cellar

Goal: a signed-in beer enthusiast records the individual bottles they own.

## Done when

- **DW-1:** A signed-in user can add a bottle of a catalog beer to their
  cellar with the dates that bottle carries.
- **DW-2:** Their cellar shows as one row per beer, opening onto the
  individual bottles beneath it.
- **DW-3:** Nobody else can see any of it.

## Tasks

| ID | Task | Status |
|---|---|---|
| [08](iteration-5/08-clear-backend-image-trivy-waivers.md) | Clear the backend image's expiring Trivy waivers | done |
| [01](iteration-5/01-cellar-module-and-schema.md) | `cellar` module, schema and domain rules | done |
| [02](iteration-5/02-cellar-rest-api.md) | Cellar REST API, scoped to the signed-in user | done |
| [04](iteration-5/04-functional-modules-adr.md) | Correct ADR-0023 and record the functional-modules convention | done |
| [05](iteration-5/05-enforce-frontend-module-boundaries.md) | Enforce frontend module boundaries | done |
| [06](iteration-5/06-feature-public-surfaces.md) | Give feature packages a public surface | done |
| [03](iteration-5/03-cellar-frontend.md) | Cellar page and add-to-cellar from the catalog | dropped |
| [11](iteration-5/11-cellar-page.md) | Cellar page for the signed-in user | refined |
| [12](iteration-5/12-cellar-navigation.md) | Navigation between Home, Catalog and Cellar | needs-refinement |
| [13](iteration-5/13-add-bottle-to-cellar.md) | Add a bottle to the cellar from the catalog | needs-refinement |
| [14](iteration-5/14-edit-remove-bottle.md) | Edit and remove a bottle from the cellar | needs-refinement |
| [09](iteration-5/09-bottle-beer-naming.md) | Reconcile the `Bottle` / `Beer` naming across `cellar` and `catalog` | dropped |
| [10](iteration-5/10-swagger-oauth2-authorization.md) | Swagger UI OAuth2 authorization for authenticated endpoints | done |

## Maintenance

| ID | Task | Status |
|---|---|---|
| [07](iteration-5/07-drop-store-schemas.md) | Drop the empty `cart`, `ordering` and `payment` schemas | done |

## Process

| ID | Task | Status |
|---|---|---|
| [15](iteration-5/15-refinement-clarification-taxonomy.md) | Give refinement a fixed ambiguity taxonomy | done |
| [16](iteration-5/16-done-when-coverage-check.md) | Check an iteration's `Done when` against the tasks meant to satisfy it | done |
| [17](iteration-5/17-localize-the-code-comment-rule.md) | Load the code-comment rule where the code is written | done |
| [18](iteration-5/18-check-code-comments.md) | Check the code-comment policy mechanically | done |
| [19](iteration-5/19-separate-implementing-from-commenting.md) | Separate implementing from commenting | done |
| [20](iteration-5/20-resweep-code-comments.md) | Re-sweep the tree's comments to the policy | done |

Tasks 15 and 16 come from
[ADR-0038](../adr/0038-in-repo-spec-driven-process.md); tasks 17-20 come from
the product owner's 2026-08-15 observation that agents keep violating
[ADR-0017](../adr/0017-code-comment-policy.md) in review no matter how often
it is raised. All six advance none of this iteration's `Done when` — the same
way `## Maintenance` above does not.
That is not incidental: it is the concrete case task 16 exists to handle, and
each task file's own `- **Covers:**` line is now the record of which `DW-N`
criteria it advances, checked by `scripts/check-tasks.mjs`
([ADR-0026](../adr/0026-task-file-format.md)) — not this paragraph, so it
does not carry a second, driftable copy of the same fact.

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
and `catalog.Beer` are named correctly relative to each other. Refinement
concluded neither name changes — see the task file's Notes — so tasks 02, 11,
13 and 14 name REST fields, DTOs and UI copy against the existing
`Bottle`/`Beer` names with no rename pending.

Task 10 was raised in review of task 02 (PR #120): Swagger UI has no way to
obtain a token for the cellar's now-authenticated endpoints. Not a blocker on
anything else in this iteration.

Task 05 is a merged prerequisite for task 11 (product-owner decision,
2026-08-11, recorded in task 05's Constraints): `cellar` becomes the
frontend's second feature package in task 11, and it is created under an
already-enforced import-boundary rule rather than retrofitted into one.
