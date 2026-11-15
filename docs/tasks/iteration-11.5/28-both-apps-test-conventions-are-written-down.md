# Task 28: Both apps' test conventions are written down, and a test file is named after what it tests

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The app's test practice is sound and unwritten. Tests query by role first,
mock only the transport and native modules, and render through real
providers. Some test files, such as `CatalogList.test.tsx` and
`states.test.tsx`, are named after no source file. The `.appearance`,
`.independence` and `.reduced` suffixes are a convention no document
states. Each new feature's tests are written by an agent that has to infer
the practice from the files around it. The web's tests are in the same
position.

## Scope

- Each app's `CONVENTIONS.md` says how a test is written: what it queries
  by, what it may mock, and what it renders through.
- It says how a test file is named: after the source file beside it, or
  with one of the suffixes it lists, each saying what it is for.
- A check fails a test file that follows neither, and the existing files
  that do not are renamed.
- [Task 12](12-a-test-waits-on-a-signal-never-on-the-clock.md)'s two rules,
  fake timers for elapsed time and a positive signal before an absence, sit
  in the same section. Task 12 writes them.

## Non-goals

- Changing what a test checks.
- The Maestro flows, whose conventions stay in `mobile/README.md`.
- Accessibility test helpers
  ([iteration 11 task 11](../iteration-11/11-mobile-accessibility-conventions.md)).

## Constraints

- **Scripts in `scripts/` are dependency-free Node with a test beside
  them**, importing only Node's built-ins
  (`scripts/check-script-imports.mjs`).
- **Decided at refinement (2026-11-15):**
  - **The conventions are written in `mobile/CONVENTIONS.md`, and in
    `web/CONVENTIONS.md` for a rule the web shares**, which
    [task 25](25-each-apps-code-conventions-have-a-file-of-their-own.md)
    creates first. Each convention names the check that holds it, or says that
    none does.
  - The existing test files conform in this task.

## Open questions

**None.**

## Acceptance criteria

- [x] A test in `scripts/` fails a fixture test file named after no source
      file and carrying no listed suffix, and passes one of each listed kind
- [x] Every test file in both apps passes that check, and their suites pass
      after the renames
- [x] Each app's `CONVENTIONS.md` states how a test is written and named,
      and `make verify-fast` is green

## Notes

Task 11 was split into tasks 11 and 25–28 at refinement on 2026-11-15, by the
product owner's decision. The analysis behind all five was drafted on
2026-11-14 against `dev` at `769b6afe`.
