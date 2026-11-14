# Task 11: The mobile app's code conventions are written down and checked

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The [mobile README](../../../mobile/README.md)'s conventions cover the layers,
the independent screens, tokens, auth and logging. Everything else is
covered by one line: the app follows [the web's](../../../web/README.md)
"wherever a rule is not about the browser". That leaves each agent to decide
which web rules carry over, and the code shows they decided differently:

- **Exports and index files.** Each feature's `index.ts` is its only entry,
  and ESLint holds that. Under `src/lib/`, two of twelve modules have an
  `index.ts` and the rest are imported file by file. One of the two is already
  bypassed, at `src/features/navigation/AppTabs.tsx:10`, and nothing fails.
  Nothing writes down or checks that `export default` appears only in route
  files.
- **Lint warnings never fail.** `eslint-config-expo` sets `exhaustive-deps`,
  `no-unused-vars` and `import/no-duplicates` to warn, and `npm run lint` runs
  ESLint without a warning limit, in both apps. The tree has no warnings
  today only because nobody has left one yet.
- **Query keys and options.** Keys are arrays written by hand in three
  shapes: an exported constant in profile and app-config, an inline array in
  catalog, and that array reused three times in `useBeers.ts` with its
  cache type spelled out by hand. `retry: false` is set in three hooks while
  the rest get TanStack's three retries, and no rule says which is meant.
  [Iteration 12](../iteration-12.md)'s persisted cache and optimistic writes
  both depend on stable keys.
- **Targets a compiler cannot check.** `CatalogScreen.tsx:96` pushes
  `/beers/${id}`, a route that does not exist yet, and `tsc` passes. In both
  apps a misspelt translation key also type-checks and shows the user the raw
  key.
- **Patterns that differ from file to file:**
  - `FiltersSheetScreen.tsx:7` reads its whole Zustand store, so it
    re-renders on every keystroke in the search field; every other store
    read takes a selector.
  - The catalog debounces in two places, each with its own `PAUSE_MS = 300`.
  - Conditional JSX is written with a ternary in 40 places and with `&&` in 5.
    On React Native, `&&` on a zero renders a bare string outside `<Text>` and
    crashes.
  - Five primitives take `spaced` or `flush` booleans to set their own outer
    margin.
  - Props are typed in three ways.
  - A feature's file roles drifted from the web's: types sit in `api.ts`, and
    `filters/controls.tsx` is a lowercase file holding two components.
- **Tests.** The test practice is sound and unwritten. Tests query by role
  first, mock only the transport and native modules, and render through real
  providers. Some test files, such as `CatalogList.test.tsx` and
  `states.test.tsx`, are named after no source file. The `.appearance`,
  `.independence` and `.reduced` suffixes are a convention no document states.

The catalog is the only large feature so far, and iteration 12's cellar is
the second. A convention set before the cellar is written costs one feature
to retrofit; set after, it costs two.

## Scope

- **A written convention** for each of these:
  - how a module exposes its public surface (exports and index files);
  - what files a feature holds, what each is for, and how a file is named;
  - how a query is keyed and how its options are set;
  - how a store is read;
  - how JSX renders conditionally;
  - how a platform difference is written;
  - how a navigation target and a translation key are made checkable;
  - how a component's props are typed, and who owns the spacing between
    components;
  - how one feature hands the user to another;
  - how a test is written and named.
- **A check per convention.** Each convention a tool can check fails
  `make verify-fast` when broken. One that no tool can check says so where
  it is written.
- **Existing code conforms.** The code under `mobile/src/` follows every
  convention this task adopts, and no user-visible behaviour changes.
- **The web where the rule is the same.** That covers the warning limit,
  import order, typed translation keys, type-aware lint rules, compiler
  strictness and query keys. The web takes each one here or in a sibling
  task, as refinement decides.

## Non-goals

- Accessibility conventions and their test helper:
  [iteration 11 task 11](../iteration-11/11-mobile-accessibility-conventions.md).
- A component catalogue or a design system. `src/components/` stays the
  app's own primitives
  ([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- A list or animation library, or any other dependency a convention does not
  require.
- Reopening a decided convention: the layers, the independent screens,
  token-only styling, or `showCatalogWith`. Replacing one needs a new ADR, so
  the open question below decides only whether this task proposes one.

## Constraints

- **Import boundaries are ESLint's, and every new policy gets a fixture** in
  `mobile/eslint-fixtures/` that `mobile/eslint.config.test.ts` sees fail
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- **An index file must not widen what an independent screen loads.** The
  blocked and crash screens import primitives by file
  (`independentScreenFiles` in `mobile/eslint.config.js`). An index in
  `src/components/` would make them evaluate every primitive, including ones
  that load network images
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md),
  [ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)).
  The independence tests must stay green.
- These ADRs bind every convention here:
  - functional modules ([ADR-0037](../../adr/0037-functional-modules.md));
  - feature-owned query hooks, one file per resource
    ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md));
  - UI state in Zustand, never API data
    ([ADR-0009](../../adr/0009-zustand-ui-state.md));
  - a feature never imports another (ADR-0012).
- **Expo, React Native and Expo Router postdate model training.** Typed
  routes and the React Compiler are checked at docs.expo.dev for the SDK in
  `mobile/package.json`, never from memory. A wrong guess fails silently.
- **The repository is on TypeScript 7.** Whether typescript-eslint's
  type-aware rules run on it is not yet verified.
- **`mobile/README.md` is at its 320-line cap** (`scripts/check-doc-size.mjs`),
  so a new convention has to replace a line or move somewhere else.
- **A new dependency is asked about, not researched**, in one batched
  question ([CLAUDE.md](../../../CLAUDE.md)).
- **Each fact has one home**
  ([ADR-0020](../../adr/0020-documentation-roles.md)). A convention's reason
  goes in an ADR only when
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s four tests
  hold; otherwise it stays in the README line.

## Open questions

- **Completion signals: how to split this.** One task, or several? A
  candidate split:
  1. The tool-enforced, decision-free rules: warning limit, import order,
     conditional JSX, store selectors, query defaults, the duplicated
     debounce, platform branches.
  2. The checks that need setup first: typed routes, typed translation keys,
     type-aware lint rules, stricter compiler flags.
  3. The conventions that need a choice: index files, feature file roles,
     props and spacing, query key shape, cross-feature handoff.
  4. Writing down the test conventions.

  Each piece's web counterpart could join it or be a task of its own.
- **Module boundaries: index files.** Either every `src/lib/<module>/` gets
  an `index.ts` as its only entry, checked like a feature's, or only features
  keep one and `lib/` is imported file by file (so `lib/motion` and
  `lib/catalogLink` lose theirs). `src/components/` gets none either way (see
  Constraints). Is `export default` outside `src/app/` a lint error?
- **Module boundaries: query keys.** Should there be a key factory per
  feature, built with TanStack's `queryOptions` helpers? Does it live in the
  resource's hook file (ADR-0041's one module per resource) or in a keys file
  of its own? Does the answer amend ADR-0041?
- **Interaction and UX: spacing.** Primitives could drop `spaced` and `flush`
  so the parent sets the space between components with `gap` or a stack
  primitive. Should the screens look identical afterwards, or is this a
  design task?
- **Functional scope: cross-feature handoff.** Write `lib/catalogLink` down
  as *the* pattern, or have this task propose an ADR for route parameters,
  which would also open the app to `kalia://` deep links?
- **Integrations: navigation targets.** Expo Router's typed routes, which
  generate types and so need a generation step before `tsc` in CI, or a
  route helper like the web's `lib/routes.ts`?
- **Constraints and trade-offs: tooling that may not fit.** If type-aware
  linting does not run on TypeScript 7, is it parked in the backlog or worked
  around? Which compiler flags: `noUncheckedIndexedAccess` and
  `noFallthroughCasesInSwitch`, or more? Eslint-config-expo already lints for
  the React Compiler; is turning it on in scope?
- **Non-functional: the README cap.** Where do the new conventions go:
  replacing existing lines, a raised cap, or a file of its own under
  `mobile/`?
- **Module boundaries: COULD-121.** The
  [quality backlog](../quality-backlog.md) finding that `src/testing/` is
  importable from production code is the same kind of gap. Is it lifted into
  this task?
- **Completion signals: how far the refactor goes.** The app is about 9,000
  lines. Does all existing code conform in this task, or only code the task
  touches?
- **Terminology.** Should the README settle "primitive" vs "component" and
  "screen" vs "sheet" as the words each convention uses?

## Acceptance criteria

- [ ] `mobile/README.md`, or the home refinement chooses, states a convention
      for each area in Scope. Each convention names the check that holds it, or
      says that none does. Verified in review against the Scope list.
- [ ] `make mobile-lint` fails on a lint warning. Verified by seeing a
      deliberate warning fail it, and the same holds for `npm run lint` in
      `web/` if refinement brings the web in.
- [ ] Every lint rule this task adds has an `eslint-fixtures/` case that
      `eslint.config.test.ts` sees fail. A deep import past a module's entry
      is one of them.
- [ ] `make mobile-lint` fails on a navigation target that does not exist
      and on a translation key `@kalia/locales` does not have. Verified with
      a misspelt route and key, unless refinement drops these checks.
- [ ] The code under `mobile/src/` passes every new check. Any
      `eslint-disable` added carries a `--` reason.
- [ ] `make mobile-test` and the Android Maestro flows pass unchanged. On
      the iOS Simulator, the catalog, filters sheet, profile and sign-in
      sheet look the same as before the refactor, as compared by the agent
      and described in words in the pull request.
- [ ] `make verify-fast` is green.

## Notes

Drafted at the product owner's request on 2026-11-14, after an analysis of
mobile's conventions against the web's. The file references in Why are from
`dev` at `769b6afe`. Related:
[COULD-119](../quality-backlog.md) (a web/mobile difference in how an API
failure is built) and COULD-121, which is named above.
