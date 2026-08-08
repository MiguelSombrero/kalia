# Task 05: Enforce frontend module boundaries

- **Status:** needs-refinement
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
  [iteration-5/03](03-cellar-frontend.md)'s refinement conversation.
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
- New dependencies are asked about, not researched (CLAUDE.md) — see open
  question 1.

## Open questions

1. Which mechanism: `import/no-restricted-paths` (via `eslint-plugin-import`,
   likely already present transitively through `eslint-config-next` — confirm
   before treating it as a new dependency) or `eslint-plugin-boundaries`
   (models layers more explicitly, but is a new, less-established
   dependency)? If a new dependency is needed either way, list it here with a
   version for the product owner.
2. Should this rule set get its own ADR, or amend ADR-0012 (which already
   states the one rule this task enforces first)?
3. Should this land as a merged prerequisite before
   [task 03](03-cellar-frontend.md) starts, so the second feature package is
   created under an enforced boundary rather than retrofitted into one, or can
   the two proceed in parallel since 03 is still `needs-refinement`?

## Acceptance criteria

- [ ] A temporary violating import for each rule (feature-to-feature; a deep
      import into `lib/api/generated/` from outside a feature's `api.ts`/
      `types.ts`; `components/ui/` importing `features/`) is confirmed to fail
      `npm run lint`, then removed — a rule never seen to fail has not been
      tested
- [ ] `npm run lint` passes on the current tree with the new rules active
- [ ] `frontend/README.md`'s Structure and Data-and-state bullets link to
      wherever the rule is now recorded
- [ ] `npm test` and `npm run build` are unaffected and green

## Notes

Surfaced by a frontend-modularity review the product owner requested
(2026-08-07). The backend's quality backlog makes the identical argument for
itself (`COULD-7`: close a layering shortcut "before `cellar`/`cart` copy the
same pattern") — this task is that argument applied to the frontend.
