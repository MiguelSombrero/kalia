# Task 05: Enforce frontend module boundaries

- **Status:** done
- **Iteration:** [5](../iteration-5.md)

## Why

The backend's module boundaries are enforced by ArchUnit and Spring Modulith
([ADR-0007](../../adr/0007-backend-package-structure.md)). The frontend's
equivalent rules exist only as prose: "the generated API client
(`lib/api/generated/`) is never imported outside `features/<feature>/`"
([README.md](../../../frontend/README.md), [ADR-0012](../../adr/0012-orval-api-client.md)),
and "shared code moves to `components/` or `lib/` only once a second feature
uses it." Nothing checks either. `tsconfig.json`'s `@/*` path alias resolves
from the repo root, so `import … from "@/lib/api/generated/catalog/catalog"`
inside `app/` or `components/` lints and typechecks clean today.
`docs/roadmap.md`'s iteration definition-of-done already names the gap:
"module boundaries verified **(backend)**."

Iteration 5 is where this stops being theoretical. `cellar` becomes the
frontend's second feature package, and its add-to-cellar affordance on the
catalog's pages is the frontend's first cross-feature dependency — the point
where an unenforced rule either gets a mechanism or gets silently violated by
whichever code lands first.

## Scope

Automated enforcement, wired into the existing `npm run lint`, for the
frontend's already-documented import rules: `app/` may import `features/`,
`components/ui/` and `lib/`; a feature does not import another feature;
`lib/api/generated/**` is reachable only from a feature's own `api.ts` and
`types.ts`; `components/ui/` may import `lib/` only.

## Non-goals

- Deciding *how* `catalog` and `cellar` compose across the boundary this task
  enforces — that belongs to
  [task 13](13-add-bottle-to-cellar.md)'s refinement conversation.
- Giving features a public `index.ts` — [task 06](06-feature-public-surfaces.md).
- Restructuring what lives inside a feature package (`api/`, `components/`,
  `hooks/` subfolders) — no observed problem this would fix.

## Constraints

- The rules being enforced are already decided
  (`frontend/README.md`'s Structure and Data-and-state bullets,
  [ADR-0012](../../adr/0012-orval-api-client.md)); this task encodes them, it
  does not choose new ones.
- `lib/api/generated/**` stays excluded from lint's own rules
  ([ADR-0012](../../adr/0012-orval-api-client.md)) — this task adds a rule
  about who may *import* it, not a rule the generated code itself must pass.
- **Mechanism: `eslint-plugin-boundaries@7.2.0`** — product-owner decision,
  2026-08-11. Neither candidate named in the original open question is
  present today, even transitively: `npm ls eslint-plugin-import --all`
  resolves empty, so both are genuinely new dependencies, not a choice
  between "new" and "already there." `eslint-plugin-boundaries` was chosen
  over `import/no-restricted-paths` (via `eslint-plugin-import` or its
  flat-config-native fork, `eslint-plugin-import-x`) because it models the
  four rules in Scope directly as named layers (`app`, `feature`,
  `components-ui`, `lib`) with directional rules between them, rather than
  as glob-pattern path zones. Version confirmed against the live npm
  registry 2026-08-11 (`npm view eslint-plugin-boundaries version`); its
  only peer dependency is `eslint>=6.0.0`, satisfied by this project's
  ESLint 9. Record it in `frontend/README.md`'s tech stack alongside the
  other pinned dependencies (CLAUDE.md new-dependencies rule).
- **This rule set amends [ADR-0012](../../adr/0012-orval-api-client.md)**,
  not a new ADR — product-owner decision, 2026-08-11. ADR-0012 already
  states the generated-client-isolation rule this task enforces first;
  extending it to cover the other three rules keeps one architectural
  decision (frontend import boundaries, enforced by lint) in one document
  rather than splitting a single `eslint.config.mjs` change across two ADRs.
- **This task is a merged prerequisite for [task 11](11-cellar-page.md)** —
  product-owner decision, 2026-08-11. `cellar` becomes the frontend's second
  feature package there; it is created under an already-enforced boundary
  rather than retrofitted into one after the fact. Task 11 is still
  `needs-refinement`, so this costs no waiting.

## Open questions

**None.**

## Acceptance criteria

- [x] A temporary violating import for each rule (feature-to-feature; a deep
      import into `lib/api/generated/` from outside a feature's `api.ts`/
      `types.ts`; `components/ui/` importing `features/`) is confirmed to fail
      `npm run lint`, then removed — a rule never seen to fail has not been
      tested
- [x] `npm run lint` passes on the current tree with the new rules active
- [x] [ADR-0012](../../adr/0012-orval-api-client.md) carries a dated amendment
      (per [docs/adr/template.md](../../adr/template.md)) stating all four
      import-boundary rules, not only the generated-client one it already had
- [x] `frontend/README.md`'s Structure and Data-and-state bullets link to
      ADR-0012
- [x] `npm test` and `npm run build` are unaffected and green

## Notes

Surfaced by a frontend-modularity review the product owner requested
(2026-08-07). The backend's quality backlog makes the identical argument for
itself (`COULD-7`: close a layering shortcut before the modules after `catalog`
copy the same pattern) — this task is that argument applied to the frontend.
