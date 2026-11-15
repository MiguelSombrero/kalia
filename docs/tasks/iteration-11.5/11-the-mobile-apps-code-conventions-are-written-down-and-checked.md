# Task 11: The mobile app's mechanical code rules fail the lint

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The [mobile README](../../../mobile/README.md)'s conventions cover the layers,
the independent screens, tokens, auth and logging. Everything else is
covered by one line: the app follows [the web's](../../../web/README.md)
"wherever a rule is not about the browser". That leaves each agent to decide
which web rules carry over, and the code shows they decided differently.
This task takes the rules a tool can check that need no design choice:

- **Lint warnings never fail.** `eslint-config-expo` sets `exhaustive-deps`,
  `no-unused-vars` and `import/no-duplicates` to warn, and `npm run lint` runs
  ESLint without a warning limit, in both apps. The tree has no warnings
  today only because nobody has left one yet.
- **Patterns that differ from file to file:**
  - `FiltersSheetScreen.tsx:7` reads its whole Zustand store, so it
    re-renders on every keystroke in the search field; every other store
    read takes a selector.
  - The catalog debounces in two places, each with its own `PAUSE_MS = 300`.
  - Conditional JSX is written with a ternary in 40 places and with `&&` in 5.
    On React Native, `&&` on a zero renders a bare string outside `<Text>` and
    crashes.
  - `retry: false` is set hook by hook while the rest get TanStack's three
    retries, and no rule says which is meant.
  - Import order and how a platform difference is written follow no rule.
- **Test-only code can ship.** `src/testing/` (`fakeTokenStore.ts`,
  `renderWithLocale.tsx`) is meant for tests only, but
  `mobile/eslint.config.js` lets `app`, `feature`, `components` and `lib`
  import it, so a fake token store could ship with no lint failure
  (COULD-121).

The catalog is the only large feature so far, and iteration 12's cellar is
the second. A rule set before the cellar is written costs one feature to
retrofit; set after, it costs two.

## Scope

- `make mobile-lint` and the web's `npm run lint` fail on any warning.
- Import order is a lint rule in both apps.
- In the app, `&&` in JSX is a lint error and the five sites become
  ternaries.
- A Zustand store is read through a selector, and reading a whole store is a
  lint error.
- Query defaults are set once, on the `QueryClient`, to what the hooks
  already mean. A hook that sets `retry` itself is a lint error unless its
  `eslint-disable` gives the reason.
- The catalog's debounce is one hook with one pause.
- A platform difference is written as `Platform.select` for a value, or a
  `.ios.tsx` / `.android.tsx` file for a component. `Platform.OS` compared
  inside JSX is a lint error.
- `src/testing/` can be imported only from test files (COULD-121).
- Each rule is written in `mobile/CONVENTIONS.md`, or `web/CONVENTIONS.md`
  for the two the web shares, and names its check.

## Non-goals

- Typed routes and translation keys, type-aware lint rules and compiler
  flags: [task 26](26-navigation-targets-translation-keys-and-strictness-are-checked.md).
- Index files, file roles, props and spacing, query keys and cross-feature
  handoff: [task 27](27-the-conventions-that-needed-a-choice-are-written-and-followed.md).
- Test conventions: [task 28](28-both-apps-test-conventions-are-written-down.md).
- Accessibility conventions:
  [iteration 11 task 11](../iteration-11/11-mobile-accessibility-conventions.md).
- A list or animation library, or any other dependency a rule does not
  require.

## Constraints

- **Import boundaries and lint policies are ESLint's, and every new policy
  gets a fixture** in the app's `eslint-fixtures/` that its
  `eslint.config.test.ts` sees fail
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- **Nothing here may widen what an independent screen loads.** The blocked
  and crash screens import primitives by file (`independentScreenFiles` in
  `mobile/eslint.config.js`), and the independence tests stay green
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- These ADRs bind every rule here: functional modules
  ([ADR-0037](../../adr/0037-functional-modules.md)), feature-owned query
  hooks ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)), UI
  state in Zustand, never API data
  ([ADR-0009](../../adr/0009-zustand-ui-state.md)), and a feature never
  imports another (ADR-0012).
- **Expo, React Native and Expo Router postdate model training.** What they
  offer is checked at docs.expo.dev for the SDK in `mobile/package.json`,
  never from memory. A wrong guess fails silently.
- **A new dependency is asked about, not researched**, in one batched
  question ([CLAUDE.md](../../../CLAUDE.md)).
- **Decided at refinement (2026-11-15):**
  - **The conventions are written in `mobile/CONVENTIONS.md`, and in
    `web/CONVENTIONS.md` for a rule the web shares**, which
    [task 25](25-each-apps-code-conventions-have-a-file-of-their-own.md)
    creates first. Each convention names the check that holds it, or says that
    none does.
  - **The existing code conforms in this task**, for the areas it covers, and
    no user-visible behaviour changes.
  - The product owner split the original task 11 into four tasks (this one
    and tasks 26–28), each with its web counterpart, after task 25.

## Open questions

**None.**

## Acceptance criteria

- [x] `make mobile-lint` fails on a lint warning, and so does the web's
      `npm run lint` — verified by seeing a deliberate warning fail each
- [x] Each lint rule this task adds has an `eslint-fixtures/` case that
      `eslint.config.test.ts` sees fail: a whole-store read, `&&` in JSX,
      `Platform.OS` in JSX, `retry` set in a hook, imports out of order, and
      `src/testing/` imported from a non-test file
- [x] A test drives the catalog's one debounce under fake timers
- [x] The code under `mobile/src/` and `web/` passes every new rule, and any
      `eslint-disable` added carries a `--` reason
- [ ] `make mobile-test` and the Android Maestro flows pass unchanged. On
      the iOS Simulator, the catalog, filters sheet, profile and sign-in
      sheet look the same as before, as compared by the agent and described
      in words in the pull request
- [x] `mobile/CONVENTIONS.md` and `web/CONVENTIONS.md` state each rule with
      its check, and `make verify-fast` is green

## Notes

Provenance: drafted at the product owner's request on 2026-11-14, after an
analysis of mobile's conventions against the web's. Task 11 was split into tasks 11 and 25–28 at refinement on 2026-11-15, by the
product owner's decision. The analysis behind all five was drafted on
2026-11-14 against `dev` at `769b6afe`.
COULD-121 was lifted into this task when the iteration was scoped. Related:
[COULD-119](../quality-backlog.md), which is
[task 13](13-the-shared-packages-export-what-both-apps-use-and-only-that.md)'s.
