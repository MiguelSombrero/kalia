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
calls a feature-owned hook (`useCellarBottles`, and later
`useAddBottle`/`useUpdateBottle`/`useRemoveBottle`) that wraps it.** The
hook owns the query key, the `queryFn`/`mutationFn`, and any
`invalidateQueries` a mutation needs against a read's key; the component
only consumes the hook's return value.

`frontend/features/cellar/useCellarBottles.ts` is the first example:

```ts
export const useCellarBottles = (entryId: string, options: { enabled: boolean }) => {
  return useQuery({
    queryKey: ["cellar", "bottles", entryId],
    queryFn: () => listCellarBottlesAction(entryId),
    enabled: options.enabled,
  });
};
```

The hook lives beside the component that uses it today
(`features/cellar/`, not `features/cellar/hooks/`) — a dedicated
subdirectory is not justified by one hook, and nothing here stops one
appearing once several exist. Each hook is feature-internal by default
(not re-exported from the feature's `index.ts`) unless a second feature
genuinely needs to call it, matching the existing public-surface rule for
every other symbol.

## Alternatives considered

**Call `useQuery`/`useMutation` directly in the component**, as `BeerRow`
originally did. The simplest option for a single call site, and arguably
premature to abstract before a second one exists
([ADR-0027](0027-process-weight.md)). Rejected because the second and
third call sites are not hypothetical — tasks 13 and 14 add them in this
same feature, imminently — and retrofitting the hook once three components
each inline their own copy of the query key is strictly more work than
extracting it now, with one real example already in hand to model the
convention on.

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
- **Revisit trigger:** if a feature accumulates enough hooks that finding
  the read vs. the mutations among them gets hard, split into
  `features/<feature>/hooks/` (queries vs. mutations, or one file per
  hook) rather than one flat directory — not needed at one hook.
