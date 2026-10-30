# Task 15: The Catalog tab lists real beers from the API

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-2, DW-4

## Why

Every piece before this one can be green on its own while the whole does not
work: a shared client nobody calls, a token the backend has never seen from a
device, a CI job with nothing to run. One thin slice through all of it — a
screen, a feature hook, the shared client, the mobile mutator, the API, the
database — is what proves the foundations hold, and it is the flow the
iteration's native end-to-end test runs in CI.

## Scope

The Catalog tab lists beers read from `/api/v1` through the shared client and a
feature hook, with loading, error and empty states. A unit test covers the
screen, and one native end-to-end flow runs in CI.

## Non-goals

- Search, filters, beer detail and the rest of the catalog —
  [iteration 11](../iteration-11.md).
- The catalog's mobile design — also iteration 11.

## Constraints

- [ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md),
  [task 06](06-decision-mobile-testing-strategy.md)'s decision, which fixes
  the end-to-end tool, the CI platforms and the backend the flow runs against,
  and leaves the emulator job's mechanics to this task.
- **Expo and React Native postdate model training** — check the installed
  version's documentation before relying on memory about how a build is
  produced or how Maestro drives it.
- [Task 09](09-shared-packages.md)'s shared client and
  [task 11](11-app-skeleton.md)'s conventions.
- Every catalog read is paginated and bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).

**Decided at refinement, 2026-10-30** (product owner):

- **A row shows the beer's name, brewery, style and ABV,** as the web's
  does.
- **The first page only;** infinite scroll is
  [iteration 11](../iteration-11.md)'s catalog list.
- **Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md)'s model** in
  plain form, until iteration 11 designs them.
- **The end-to-end flow is anonymous.** Driving sign-in through the system
  browser is fragile under Maestro; [task 14](14-sign-in-on-mobile.md)
  checks sign-in by hand on both simulators.
- **The flow is a Maestro flow, run in CI on Android on a Linux runner
  against the full Docker stack, and locally on the iOS Simulator through
  `make verify`** — [task 06](06-decision-mobile-testing-strategy.md)'s
  decision.

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)
was accepted:

- **The CI flow runs a build that carries its own JavaScript,** produced from
  the same prebuilt native project, so no Metro server runs on the runner and
  the flow opens the app directly. Developers keep running development-client
  builds against Metro. A debug build plus Metro on the runner was rejected as
  more moving parts in a required job. The iOS leg runs the same kind of
  build. How such a build is produced from the generated project is checked
  against the installed Expo version's documentation.
- **The API origin is [task 11](11-app-skeleton.md)'s,** one place the app
  reads it from. This task and [task 14](14-sign-in-on-mobile.md) only use it,
  and the flow's origin is the one the make target or the CI job sets from the
  stack's edge port.
- **`make verify` runs the flow on every platform the host can** — the iOS
  Simulator on a Mac, the Android emulator when its toolchain is present. It
  prints which platform ran and which it skipped and why, and fails when none
  ran, so a skip is never silent. This settles the point
  [ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)
  left to this task for a host that is not a Mac.
- **The states read:**

  | State | English | Finnish |
  |---|---|---|
  | Loading | Loading beers… | Ladataan oluita… |
  | Error | Couldn't load beers. | Oluiden lataus ei onnistunut. |
  | Retry action | Try again | Yritä uudelleen |
  | Empty | No beers have been added yet. | Oluita ei ole vielä lisätty. |

  Loading and retry reuse the web's strings. The error and empty strings are
  new and go into the shared strings package in both languages; the web's
  empty string talks about a search, which the app does not have yet. The
  error state offers the retry action, as
  [ADR-0022](../../adr/0022-loading-error-empty-states.md)'s recovery does.
- **The Android job needs its own dependencies asked for first.** The action
  or script that boots the emulator, the Maestro command-line tool's version
  and the Android API level are new dependencies; this task asks one batched
  question for them when it starts (`CLAUDE.md`), as
  [task 11](11-app-skeleton.md) does for the stack.
- **The Android job runs when `mobile/`, `packages/`, `backend/` or the
  stack's inputs change** — the edge, Keycloak, compose and the workflows —
  the web end-to-end job's triggers plus the two new directories, because a
  backend change can break the flow. It is wired into `ci-passed`, so it is
  required.
- **A failed flow is not retried automatically,** and it uploads Maestro's
  output and screenshots as the Playwright job uploads its report. A retry
  would hide a flaky required check, which
  [task 16](16-first-profile-reads-never-race.md) is the example of; failures
  are logged under
  [ADR-0084](../../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md).
- **The flow looks for a beer the running stack returns on the first page,**
  fixed against the stack when the flow is built. The catalog also holds the
  Wikidata import, so the first beer by the default order is not necessarily
  one from the seed.

## Open questions

**None.**

## Acceptance criteria

- [ ] On both simulators, the Catalog tab lists beers from the local stack —
      described in the PR
- [ ] A Jest unit test renders the list from a mocked client, and its error
      and empty states
- [ ] The unit test and the Maestro flow follow [ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)'s
      conventions — the test as in [task 11](11-app-skeleton.md); the flow in
      `mobile/.maestro/`, selecting by visible text or accessibility label,
      starting from a freshly installed app and depending on no other flow;
      confirmed by reading them
- [ ] A Maestro flow opens the app and finds a seeded beer in the list, runs
      in CI on Android against the full stack as a required check, and was
      confirmed to fail against a build with the list broken
- [ ] The same flow passes on the iOS Simulator through `make verify` —
      described in the PR
- [ ] The flow runs against a build of the project `expo prebuild` generates,
      carrying its own JavaScript so no Metro server runs, not Expo Go, and
      building it needs no Expo account or paid service — confirmed by
      building it in a shell logged out of `eas`
      ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md))
- [ ] The error and empty states read as the table above in both languages,
      the strings are in the shared strings package, and the unit test shows
      the retry action calling the client again
- [ ] `make verify` prints which platform's flow ran and which it skipped and
      why, and fails when none ran — confirmed by running it with the
      simulator and the emulator absent
- [ ] The Android job runs on the triggers above, is part of `ci-passed`,
      does not retry a failed flow, and uploads Maestro's output on failure —
      confirmed by reading the workflow and by a deliberately failing run
- [ ] `make verify` is green
