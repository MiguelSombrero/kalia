# Task 11: The app has four tabs and the web's conventions

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-1, DW-4

## Why

Every feature from [iteration 11](../iteration-11.md) on lands in an app shell,
and the conventions that shell starts with are the ones features copy. The web
learned several of its conventions the hard way — data fetching behind
feature-owned hooks ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)),
UI state in Zustand, forms through react-hook-form and Zod, strings through
i18next, import boundaries enforced per feature. Starting the app without them
means relearning each one.

## Scope

An Expo Router app in `mobile/` with four tabs — Home, Catalog, Cellar,
Profile — over placeholder screens, safe areas handled, and the web's
conventions in place and enforced: TanStack Query behind feature hooks,
Zustand, react-hook-form with Zod, i18next following the device locale, and
import boundaries per feature. Its lint, type check and unit tests run in
`make verify-fast`, `make verify` and CI.

## Non-goals

- The design of the app — [iteration 11](../iteration-11.md) gives it a
  design language; this task is deliberately plain.
- Real data on any screen — [task 15](15-walking-skeleton-slice.md).
- Sign-in — [task 14](14-sign-in-on-mobile.md).

## Constraints

- Tasks [02](02-decision-the-mobile-stack.md),
  [03](03-decision-repo-layout-and-code-sharing.md) and
  [06](06-decision-mobile-testing-strategy.md) decide the stack, where it
  lives and how it is tested.
- **Expo and React Native postdate model training** — check the installed
  version's documentation before relying on memory about Expo Router.
- [ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md) sets the
  web's accessibility bar.

**Decided at refinement, 2026-10-30** (product owner):

- **This task wires the mobile checks into the gates:** lint, type check and
  Jest unit tests in `make verify-fast`, `make verify` and CI as a required
  job — moved here from [task 07](07-process-carries-a-third-codebase.md),
  because this task creates the app they check.
- **Unit tests are Jest with React Native Testing Library through Expo's
  preset** ([task 06](06-decision-mobile-testing-strategy.md)).
- **This task asks the one batched dependency question** for the stack —
  the Expo SDK, and with it React Native and React, and the libraries the
  conventions need ([task 02](02-decision-the-mobile-stack.md)).
- **WCAG 2.2 AA applies to the app,** stated in platform terms: every tab
  and control has a VoiceOver and TalkBack label, and text scales with the
  system font size. [Iteration 11](../iteration-11.md) writes the full
  mobile accessibility conventions down.
- **The tab labels reuse the web's navigation strings** in en and fi.
- **The app is usable signed out;** the Profile tab then shows a sign-in
  prompt rather than being hidden ([task 14](14-sign-in-on-mobile.md)).
- **A placeholder screen shows its tab's heading and "Coming soon" /
  "Tulossa pian".**
- **A device in neither English nor Finnish falls back to the web's default
  locale.**
- **Light mode and portrait only** until iteration 11 decides dark mode and
  the interaction model.

**Decided in the refinement of tasks [08](08-workspaces-refactor.md) and
[15](15-walking-skeleton-slice.md), 2026-10-30** (product owner), which bind
this one:

- **This task owns the one place the app reads its origins from,** the API's
  and Keycloak's, set per run from the stack's ports by the make targets and
  CI. Tasks [14](14-sign-in-on-mobile.md) and
  [15](15-walking-skeleton-slice.md) only use it.
- **Once `mobile/` exists, the web image is checked to carry none of the
  app's dependencies,** which is the proof of the scoped install
  [task 08](08-workspaces-refactor.md) sets up and cannot demonstrate before a
  second workspace exists.

**Decided in the second pass, 2026-10-30** (product owner), after the
decisions of tasks 02, 03 and 06 were accepted:

- **The app's identifier is `fi.kalia.app`** as the iOS bundle identifier and
  the Android package name, and its URL scheme is `kalia`
  ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
  An Android package name cannot change once the app is published.
- **The first tab is labelled "Home" / "Etusivu",** the web's `nav.home`. Its
  route and screen are the activity feed's; the web calls its front page Home
  too. This supersedes the task's earlier "Feed" label, which needed strings
  the web does not have.
- **This task registers the app's transport** with the shared core in
  `@kalia/api` ([task 09](09-shared-packages.md)): base URL from the origin
  above, no token yet. [Task 14](14-sign-in-on-mobile.md) adds the token
  source, and [task 15](15-walking-skeleton-slice.md) makes the first call.
- **The strings come from `@kalia/locales`,** so the tab labels and the
  placeholder strings are added there in both languages. This task depends on
  [task 08](08-workspaces-refactor.md) and [task 09](09-shared-packages.md).

## Open questions

**None.**

## Acceptance criteria

- [ ] The app launches on both simulators to four tabs, each reachable and
      labelled in the device's language — verified on both, described in the
      PR
- [ ] A Jest unit test renders each tab's screen and finds its heading, in
      English and in Finnish
- [ ] The unit tests follow [ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)'s conventions —
      Jest and React Native Testing Library through the `jest-expo` preset,
      each test file beside the file it tests, elements found by role,
      accessible name or text, no network — and the project sets no coverage
      threshold; confirmed by reading the tests and the Jest configuration
- [ ] A lint rule fails when one feature imports another's internals —
      confirmed by a test fixture or a deliberately broken import
- [ ] `make verify-fast` runs the mobile lint, type check and unit tests, and
      fails when a mobile unit test fails — confirmed by breaking one
- [ ] CI runs the same checks as a required job
- [ ] The app is a development build (it depends on Expo's development client
      and the PR's simulator run used `expo run:ios` and `expo run:android`,
      not Expo Go), and `mobile/` has a `strict` TypeScript configuration; `ios/` and `android/` are gitignored
      and generated by `expo prebuild`, so a fresh clone holds neither —
      confirmed by `git check-ignore` on both and a type check that fails on
      an implicit `any` ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md))
- [ ] The app's identifier is `fi.kalia.app` on both platforms and its URL
      scheme `kalia`, read from `app.json`
- [ ] One module holds the API and Keycloak origins, set from the stack's
      ports by the make targets and CI with no port written in source, and the
      app registers `@kalia/api`'s transport from it — a unit test shows a call
      reaching the configured origin, and one without registration throws
- [ ] The web image built after this task carries none of the app's
      dependencies — confirmed by listing the image's installed packages
      against `mobile/package.json`
- [ ] The tab labels and placeholder strings are in `@kalia/locales` in both
      languages, the first tab reading "Home" / "Etusivu"
- [ ] The SDK version is recorded in `mobile/package.json` and in no prose
      document — confirmed by a search of `docs/` and the READMEs for it
      ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md))
