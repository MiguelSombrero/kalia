# Task 26: Navigation targets, translation keys and compiler strictness are checked in both apps

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Some mistakes in the apps pass every check today:

- `CatalogScreen.tsx:96` pushes `/beers/${id}`, a route that does not exist
  yet, and `tsc` passes.
- In both apps a misspelt translation key type-checks and shows the user the
  raw key.
- Neither app runs typescript-eslint's type-aware rules, and the repository
  is on TypeScript 7, where they have not been tried.
- Neither app turns on `noUncheckedIndexedAccess` or
  `noFallthroughCasesInSwitch`, so an index read is typed as always present.

Each of these is a check that needs setup before it can hold. Iteration 12's
cellar adds routes, keys and lookups of every kind.

## Scope

- A navigation target that does not exist fails the mobile gate in
  `make verify-fast`.
- A translation key `@kalia/locales` does not have fails type-checking in
  both apps.
- Type-aware typescript-eslint rules run in both apps, or, if they do not
  run on TypeScript 7, they are parked in the [backlog](../backlog.md) with
  what failed.
- `noUncheckedIndexedAccess` and `noFallthroughCasesInSwitch` are on in both
  apps, and the code passes them.
- Each check is written in its app's `CONVENTIONS.md`.

## Non-goals

- The React Compiler.
- The rules [task 11](11-the-mobile-apps-code-conventions-are-written-down-and-checked.md)
  adds, and the conventions of tasks 27 and 28.
- Deep links ([iteration 13](../iteration-13.md)).

## Constraints

- **Expo, React Native and Expo Router postdate model training.** What they
  offer is checked at docs.expo.dev for the SDK in `mobile/package.json`,
  never from memory. A wrong guess fails silently.
- **This Next.js postdates model training**: check
  `node_modules/next/dist/docs/` before relying on memory
  ([CLAUDE.md](../../../CLAUDE.md)).
- **Import boundaries and lint policies are ESLint's, and every new policy
  gets a fixture** in the app's `eslint-fixtures/` that its
  `eslint.config.test.ts` sees fail
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- **A new dependency is asked about, not researched**, in one batched
  question ([CLAUDE.md](../../../CLAUDE.md)).
- **Decided at refinement (2026-11-15):**
  - **Navigation targets:** Expo Router's typed routes, if their types can
    be generated without Metro running, in CI as locally, as checked at
    docs.expo.dev for the pinned SDK. If they cannot, a route helper like
    the web's `lib/routes.ts` instead, with a lint ban on a string literal
    passed to a router call.
  - **Type-aware lint:** if it does not run on TypeScript 7, it is parked in
    the backlog. There is no workaround.
  - **Compiler flags:** `noUncheckedIndexedAccess` and
    `noFallthroughCasesInSwitch`, and no more.
  - **The React Compiler** stays out.
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

- [ ] A misspelt route fails the mobile gate in `make verify-fast`, and a
      misspelt translation key fails type-checking in both apps — verified
      with one of each, and each was seen to pass before the change
- [ ] Both apps' `tsconfig.json` turn on the two flags, and both apps'
      type-check and test suites pass
- [ ] Either a type-aware rule runs in both apps with an `eslint-fixtures/`
      case that its config test sees fail, or the backlog names what failed
      on TypeScript 7
- [ ] Each app's `CONVENTIONS.md` states each check, and `make verify-fast`
      is green

## Notes

Task 11 was split into tasks 11 and 25–28 at refinement on 2026-11-15, by the
product owner's decision. The analysis behind all five was drafted on
2026-11-14 against `dev` at `769b6afe`.
