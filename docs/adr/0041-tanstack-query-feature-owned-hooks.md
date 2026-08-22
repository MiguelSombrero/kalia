# ADR-0041: Client components call a feature-owned hook, never `useQuery`/`useMutation` directly

- **Status:** accepted
- **Date:** 2026-08-16

## Context

[ADR-0008](0008-tanstack-query.md) mandates TanStack Query for every
client-component read and mutation, but — like the `queryFn` question
[ADR-0040](0040-client-reads-via-server-actions.md) settled — never had a
real consumer to prove its shape against until the cellar page. `BeerRow`
(the first client component to call `useQuery`, per ADR-0040) did so inline:

```tsx
const bottlesQuery = useQuery({
  queryKey: ["cellar", "bottles", row.entryId],
  queryFn: () => listCellarBottlesAction(row.entryId),
  enabled: isExpanded,
});
```

Raised in PR review: with the query key and `queryFn` written directly in
the component, a second consumer of the same data — or a mutation that
needs to `invalidateQueries` against this exact key — has to copy the key
array correctly rather than import it. [Task 13](../tasks/iteration-5/13-add-bottle-to-cellar.md)
and [task 14](../tasks/iteration-5/14-edit-remove-bottle.md), the next work
in this feature, add mutations (add/edit/remove a bottle) that will need
`invalidateQueries` against this same cache entry, so the question was
worth settling now rather than after a second call site already existed.

## Decision

**A client component never calls `useQuery`/`useMutation` directly — it
calls a feature-owned hook that wraps it.** Each *operation* gets its own
hook (`useCellarBottles` for the read; `useAddBottle`/`useUpdateBottle`/
`useRemoveBottle` for tasks 13/14's mutations), never one hook per
*resource* exposing every operation as a returned method — a mutation's
`onSuccess`/`invalidateQueries` logic is specific to what changed, and
bundling four operations behind one hook's return value mixes those
concerns and forces every consumer's test to stub all four to exercise one.

**Hooks for one resource are colocated in one file**, sharing the query key
they all reference, rather than one file per hook. `useCellarBottles` today,
and `useAddBottle`/`useUpdateBottle`/`useRemoveBottle` once tasks 13/14
land, all belong in the same module — separate exported hooks, not a
merged one, but one place to find anything about the bottles resource
rather than four files to open. (The module will likely be renamed from
`useCellarBottles.ts` to something resource-shaped, e.g. `useBottles.ts`,
once it holds more than the one hook its current name describes — not done
now, since renaming a file with one export ahead of the exports that would
justify the new name is no more than guessing at it.)

The hook owns the query key, the `queryFn`/`mutationFn`, and any
`invalidateQueries` a mutation needs against a read's key; the component
only consumes the hook's return value.

`frontend/features/cellar/hooks/useCellarBottles.ts` is the first example:

```ts
export const useCellarBottles = (entryId: string, options: { enabled: boolean }) => {
  return useQuery({
    queryKey: ["cellar", "bottles", entryId],
    queryFn: () => listCellarBottlesAction(entryId),
    enabled: options.enabled,
  });
};
```

**Hooks live in `features/<feature>/hooks/` from the start**, even for one
hook — not colocated with the components in the feature's root, and not
deferred until a second hook exists. `eslint-plugin-boundaries`' `features/*`
pattern still classifies a file nested under a feature's `hooks/`
subdirectory as that feature with no config change (verified: `npm run
lint` and `npm run build` green with the hook in place). A hook with no
single feature owner (e.g. a future `useDebounce`) would go in a top-level
`hooks/` instead — not created now, since nothing needs it yet; when one
does, `eslint.config.mjs`'s `boundaries/elements` needs a new entry for it
first, unlike the feature-scoped case, which needed none.

Each hook is feature-internal by default (not re-exported from the
feature's `index.ts`) unless a second feature genuinely needs to call it,
matching the existing public-surface rule for every other symbol.

## Alternatives considered

**One hook per resource** (`useBottles()` returning `{ data, add, update,
remove }`), rather than one hook per operation. Fewer hook names to
remember, and everything about bottles genuinely is in one place. Rejected
in favor of one-hook-per-operation-colocated-in-one-file instead: it gets
the same "one place to look" property without merging a read's caching
concerns and a mutation's `invalidateQueries`/`onSuccess` concerns into a
single function's return value, and it keeps each hook's own test narrow
(one mocked dependency, not four).

**Call `useQuery`/`useMutation` directly in the component**, as `BeerRow`
originally did. The simplest option for a single call site, and arguably
premature to abstract before a second one exists
([ADR-0027](0027-process-weight.md)). Rejected because the second and
third call sites are not hypothetical — tasks 13 and 14 add them in this
same feature, imminently — and retrofitting the hook once three components
each inline their own copy of the query key is strictly more work than
extracting it now, with one real example already in hand to model the
convention on.

**Colocate hooks flat in `features/<feature>/` alongside components, and
only move to a `hooks/` subdirectory once several accumulate.** Slightly
less structure for the first hook. Rejected for the same reason as the
call-site question above: task 13/14's mutation hooks are not hypothetical,
so the directory this feature settles on today is the one a second and
third hook land in imminently — moving files (and updating every import)
once they exist is strictly more churn than starting in the right place.

## Consequences

- Good, because a query key is written once, in the hook that owns it —
  nothing to keep in sync across components, and a mutation's
  `invalidateQueries` call references the same key by importing the hook's
  module, not by re-typing the array.
- Good, because a component's test only needs to mock the hook's own
  dependencies (here, `listCellarBottlesAction`), and the hook itself gets
  a focused unit test (`useCellarBottles.test.tsx`, via
  `@testing-library/react`'s `renderHook`) independent of any component.
- Bad, because a hook with exactly one consumer is indistinguishable from
  having inlined `useQuery` — the benefit only materializes once a second
  caller or a related mutation exists. That is true of `useCellarBottles`
  today; it stops being true the moment tasks 13/14 land.
- **Revisit trigger:** the first hook with no single feature owner —
  `hooks/` at the repository root needs its own entry in
  `eslint.config.mjs`'s `boundaries/elements` before anything may import
  from it, unlike `features/<feature>/hooks/`, which needed none.

## Evidence

`eslint-plugin-boundaries`' `features/*` element pattern
(`eslint.config.mjs`, `partialMatch: false`) was unverified against a
nested subdirectory before this decision. Checked directly: moved
`useCellarBottles.ts` into `features/cellar/hooks/`, updated its own
relative import (`./actions` → `../actions`) and `BeerRow.tsx`'s import
path, then ran `npm run lint` and `npm run build` — both green, no
boundary violation and no new entry needed in `eslint.config.mjs`.
