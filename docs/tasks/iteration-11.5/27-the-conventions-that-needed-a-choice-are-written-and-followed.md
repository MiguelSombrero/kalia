# Task 27: The conventions that needed a choice are written down, and the code follows them

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Some of the app's conventions differ from file to file because nobody chose
between the ways they are written:

- **Exports and index files.** Each feature's `index.ts` is its only entry,
  and ESLint holds that. Under `src/lib/`, two of twelve modules have an
  `index.ts` and the rest are imported file by file. One of the two is already
  bypassed, at `src/features/navigation/AppTabs.tsx:10`, and nothing fails.
  Nothing writes down or checks that `export default` appears only in route
  files.
- **Query keys** are arrays written by hand in three shapes: an exported
  constant in profile and app-config, an inline array in catalog, and that
  array reused three times in `useBeers.ts` with its cache type spelled out
  by hand. [Iteration 12](../iteration-12.md)'s persisted cache and
  optimistic writes both depend on stable keys, on the web as in the app.
- **Spacing.** Five primitives take `spaced` or `flush` booleans to set their
  own outer margin.
- **Props** are typed in three ways.
- **File roles** drifted from the web's: types sit in `api.ts`, and
  `filters/controls.tsx` is a lowercase file holding two components.
- **One feature handing the user to another** is not atomic.
  `showCatalogWith` records its request in a second store that the Catalog
  applies in an effect, so the Catalog can render and request once with the
  old filters first (COULD-143).
- **The words differ:** "primitive" and "component", "screen" and "sheet".

## Scope

- **Index files:** a feature's `index.ts` is its only entry. `src/lib/` is
  imported file by file, so `lib/motion` and `lib/catalogLink` lose theirs,
  and an `index.ts` under `src/lib/` is a lint error. `src/components/` has
  no index. `export default` outside `src/app/` is a lint error.
- **File roles and names:** a feature's files each have one role, named as
  the web names them where the role is the same. Types leave `api.ts`, and
  one component is one PascalCase file.
- **Props** are typed one way.
- **Spacing:** primitives drop `spaced` and `flush`, and the parent sets the
  space between components with `gap`.
- **Query keys:** each resource has a key factory built with TanStack's
  `queryOptions`, in that resource's hook file, in both apps.
- **Cross-feature handoff:** `lib/catalogLink` is written down as the
  pattern, and `showCatalogWith` replaces the Catalog's filters atomically,
  so its first request carries the new ones (COULD-143).
- **Terms:** the conventions use "primitive" for `src/components/` and
  "component" for anything else, and "screen" and "sheet" for what each one
  is.
- Each convention is written in `mobile/CONVENTIONS.md`, and query keys in
  `web/CONVENTIONS.md` too.

## Non-goals

- Reopening a decided convention: the layers, the independent screens,
  token-only styling, or `showCatalogWith` itself. Deep links and route
  parameters stay with [iteration 13](../iteration-13.md).
- A component catalogue or a design system
  ([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- A visual change. The screens look as they do today.

## Constraints

- **Import boundaries and lint policies are ESLint's, and every new policy
  gets a fixture** in the app's `eslint-fixtures/` that its
  `eslint.config.test.ts` sees fail
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- **Nothing here may widen what an independent screen loads.** The blocked
  and crash screens import primitives by file (`independentScreenFiles` in
  `mobile/eslint.config.js`), and the independence tests stay green
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- These ADRs bind every convention here:
  [ADR-0037](../../adr/0037-functional-modules.md),
  [ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md),
  [ADR-0009](../../adr/0009-zustand-ui-state.md) and ADR-0012.
- **Expo, React Native and Expo Router postdate model training.** What they
  offer is checked at docs.expo.dev for the SDK in `mobile/package.json`,
  never from memory. A wrong guess fails silently.
- **Decided at refinement (2026-11-15):**
  - `src/lib/` is imported file by file, chosen over an index per module
    because it matches how the independent screens must import, so the rule
    has no exceptions.
  - The key factory lives in the resource's hook file, which keeps
    ADR-0041's one module per resource. ADR-0041 is not amended.
  - The spacing change is not a design task. The screens must look identical
    afterwards.
  - `lib/catalogLink` stays the pattern. No ADR for route parameters is
    proposed.
  - The terms above are settled.
  - Where this task leaves a form open, such as which of the three props
    styles wins, it picks one and the pull request names the choice.
  - **The conventions are written in `mobile/CONVENTIONS.md`, and in
    `web/CONVENTIONS.md` for a rule the web shares**, which
    [task 25](25-each-apps-code-conventions-have-a-file-of-their-own.md)
    creates first. Each convention names the check that holds it, or says that
    none does.
  - **The existing code conforms in this task**, for the areas it covers, and
    no user-visible behaviour changes.

## Open questions

**None.**

## Acceptance criteria

- [ ] `eslint-fixtures/` cases that `eslint.config.test.ts` sees fail: a deep
      import past a feature's `index.ts`, an `index.ts` under `src/lib/`, and
      `export default` outside `src/app/`
- [ ] A test shows `showCatalogWith` reaching the Catalog with the new
      filters on its first request. It failed before the change
- [ ] A test in each app reads a query's key through its factory, and
      `useBeers.ts` holds no hand-written key or cache type
- [ ] No primitive takes `spaced` or `flush`. On the iOS Simulator, the
      catalog, filters sheet, profile and sign-in sheet look the same as
      before, as compared by the agent and described in words in the pull
      request
- [ ] `make mobile-test`, the web's tests and the Android Maestro flows pass
- [ ] `mobile/CONVENTIONS.md` states each convention with its check, and
      `make verify-fast` is green

## Notes

Task 11 was split into tasks 11 and 25–28 at refinement on 2026-11-15, by the
product owner's decision. The analysis behind all five was drafted on
2026-11-14 against `dev` at `769b6afe`. COULD-143 was lifted into the original
task 11 when the iteration was scoped, and is held here.
