# ADR-0096: Mobile unit tests run on Jest and end-to-end flows on Maestro, with Android the only CI platform

- **Status:** accepted
- **Date:** 2026-10-30

## Context

[architecture.md §7](../architecture.md#7-testing-strategy) describes testing
for a backend and a web app. Its end-to-end tool, Playwright, drives a browser
and cannot drive a native app, so the Expo app that iteration 9 adds needs a
test strategy of its own: a unit-test runner, a native end-to-end tool, what
runs where, and what backend an end-to-end flow talks to. Every build task
after this one writes tests in whatever shape it finds, and picking per task is
how the web ended up with two test conventions before
[ADR-0026](0026-task-file-format.md) required tests in the task that creates
the behaviour.

CI is the hard part. An Android emulator can run on a Linux runner. An iOS
Simulator needs a macOS one, and an end-to-end flow talks to the full stack —
Spring, PostgreSQL and Keycloak in Docker — which a macOS runner does not give
it. The constraints on the answer are
[ADR-0046](0046-edit-time-checks-and-one-verify-gate.md)'s, that
`make verify-fast` needs neither Docker nor a build, and the project's: Kalia
adds no cost and puts no payment card on file anywhere: no paid account, cloud
build, hosting or billed CI minute.

## Decision

**Mobile unit tests are Jest with React Native Testing Library through Expo's
`jest-expo` preset; end-to-end flows are Maestro; CI runs the flow on Android
only, on a Linux runner against the full Docker stack, as a required check,
and iOS runs the same flow locally through `make verify`.**

- **Unit tests** render a screen or component with React Native Testing
  Library and query it the way a user or a screen reader finds it: by role,
  accessible name or visible text, with a test ID only where none of those
  can identify the element. The generated API client is mocked at its
  boundary and no unit test touches the network. Test files sit beside the
  file they test, as the web's do. The runner and library are the ones Expo's
  own unit-testing guide installs.
- **End-to-end flows** are Maestro YAML flows kept in `mobile/.maestro/`,
  which is where Expo's guide for running Maestro keeps them. A flow drives a
  built app from outside through the device's accessibility interface, so
  nothing is compiled into the app and the native projects Expo generates are
  used as they are. A flow selects elements by visible text or accessibility
  label, so a broken label fails the flow as it would fail a screen reader. A
  flow starts from a freshly installed app and depends on no other flow's
  state. A new flow is confirmed to fail against a build with the thing it
  checks broken, so a pass means something.
- **One real stack, no mock layer.** The flow runs against the full Docker
  stack, seeded as the local one is. The only test that crosses from the app
  to the backend is an end-to-end flow.
- **CI covers Android and not iOS.** A required CI job builds the Android app
  on a Linux runner, starts the stack, boots an emulator and runs the flow.
  The iOS Simulator runs the same flow locally, in `make verify`, on a Mac.
  The reason iOS is not in CI is that the macOS runners have no Docker to run
  the stack on, not what it costs: the repository is public, and GitHub lists
  standard hosted runners there as free (see Evidence).
- **What runs where.** `make verify-fast` runs the mobile lint, the type
  check and the Jest unit tests, and needs neither Docker nor a native build.
  Native builds and the end-to-end flow are in `make verify` only, and the
  flow is a required CI check through the Android job above.
- **No coverage threshold,** matching the web, which has none.
- **What this costs the repository: nothing.** Jest, React Native Testing
  Library and Maestro's command-line tool (Apache 2.0) are free software, the
  Android emulator comes with the Android SDK the runner image lists, and the Linux job runs on a standard GitHub-hosted runner, which
  is free in a public repository. The build runs on that runner, so the
  decision uses no cloud build service and no paid account, and it checks
  against the no-cost rule above. It rests on the repository staying public.
- **Versions are not decided here.** The test tools are new dependencies, and
  their versions are asked in
  [task 11](../tasks/iteration-9/11-app-skeleton.md)'s batched dependency
  question. The emulator job's mechanics — which action or script boots the
  emulator, the Android API level — belong to
  [task 15](../tasks/iteration-9/15-walking-skeleton-slice.md), which builds
  the job.

Out of scope: visual regression testing and testing on real devices
([iteration 10](../tasks/iteration-10.md) onwards), and wiring the checks into
`make` and CI, which tasks 11 and 15 do.

## Alternatives considered

- **Vitest for unit tests.** The web already uses it, so one runner would cover
  both apps. Rejected by the product owner because its React Native support is
  not first-class, and Expo's own preset and unit-testing guide are built for
  Jest. The price is a second runner beside the web's.
- **Detox for end-to-end flows.** It is the best known React Native
  end-to-end tool. Rejected because it is a gray-box tool, "having access to
  the internals of the app under test" in its own words, and installing it
  edits each native project: Gradle dependencies, an instrumented test class
  and release-build rules on Android. In an app whose native projects are
  generated continuously, those edits have to survive every regeneration, a
  standing cost Maestro does not have. Detox's own project-setup guide says
  an Expo project's setup is different and sends the reader elsewhere; this
  decision did not follow that further.
- **iOS in CI against a mocked API.** It would put both platforms in CI
  without a macOS runner needing Docker. Rejected because the mock is a second
  backend to keep in step with the real one, and a flow that passes against the
  copy proves little about the original: the end-to-end flow is the one test
  meant to cross the real boundary, and a mock removes that.
- **Both platforms against the real stack in CI.** It would need a macOS job to
  run the stack, or to reach one running elsewhere. Rejected for now because
  nothing checked shows a macOS runner running Docker (see Evidence), and
  inventing a hosted stack for the job to reach would add hosting, which the
  no-cost rule rules out.
- **Maestro Cloud, or Expo's hosted workflows, to run the flow.** They would
  remove the emulator job. Rejected because a hosted service is a paid account
  or a cloud build, which the no-cost rule rules out; Maestro's own README
  describes Maestro Cloud as paid, with a trial.
- **A coverage threshold.** Rejected because the web has none, and a threshold
  for one codebase of three would be a convention the other two do not follow.
- **None for the unit-test library.** React Native Testing Library was the only
  library considered: Expo's guide recommends it, and recommends it over
  `react-test-renderer`, which it says does not support React 19.

## Consequences

- Good, because one decision covers every mobile test task: the build tasks
  write Jest tests and Maestro flows in a shape that is already fixed.
- Good, because the end-to-end flow talks to the real backend, so it catches a
  contract that drifts from what the app calls, which a mock cannot.
- Good, because nothing is compiled into the app for testing, so the app that
  is tested is the app that ships.
- Good, because the decision adds no cost and no account: the required job runs
  on a free standard runner, and the tools are free software.
- Bad, because an iOS-only regression is not caught by CI. The flow runs on
  iOS only where someone runs `make verify` on a Mac, so the iOS result is
  reported in the pull request, not enforced by a check. Nothing stops a merge
  that breaks the iOS app but not the Android one.
- Bad, because the Android job is a heavy required check: it builds a native
  app, starts the full stack and boots an emulator before it runs one flow, so
  it is slower than every other check and its first weeks may be flaky. A flaky
  required check is a cost on every pull request.
- Bad, because the project now keeps two runners, Jest for the app and Vitest
  for the web, and their configuration and idioms differ.
- Neutral, because `make verify` on a machine that is not a Mac cannot run the
  iOS flow. How it behaves there is a decision for task 15, which builds the
  target.
- Neutral, because the test tools are new dependencies pinned in task 11, and
  an Expo SDK upgrade can force a Jest upgrade with it.
- **Revisit trigger:** the repository becomes private, which ends the free
  minutes this rests on and needs the cost checked again; or a macOS runner
  that can run the stack becomes available, which would put iOS in CI.

## Evidence

Checked on 2026-10-30 against the documentation named in each line, fetched
for this decision rather than recalled. A figure here is only as current as the
page.

- **Actions minutes in a public repository.** GitHub's Actions billing page
  lists "Standard GitHub-hosted runners in public repositories" among usage
  that stays free and does not draw on the included minutes, and says "The
  use of standard GitHub-hosted runners is free" for public repositories. The
  page does not break the claim down by operating system, and it says larger
  runners are billed for public repositories — so the Android job uses a
  standard runner label. The repository's visibility was `PUBLIC` when this
  was written.
- **Standard Linux runner for a public repository.** GitHub's runner
  reference lists `ubuntu-latest` at 4 CPUs and 16 GB for a public repository,
  and says "GitHub-hosted Linux runners support hardware acceleration for
  Android SDK tools". GitHub's changelog of 2 April 2024 extended hardware
  acceleration to the 2-vCPU Linux runners and shows the one workflow step it
  needs: a udev rule giving the `kvm` device group permissions, reloaded
  before the emulator starts. The same rule is in the README of the
  `android-emulator-runner` action, which also recommends Ubuntu over macOS
  runners for emulators. That action is a third-party dependency and is for
  task 15's batched question, not chosen here.
- **macOS runners and Docker.** The software list of the `macos-15` arm64
  runner image has no Docker, docker-compose or Colima entry; it lists the
  Android SDK and emulator. GitHub's runner reference says of the arm64 macOS
  runners: "Nested-virtualization is not supported due to the limitation of
  Apple's Virtualization Framework", so a VM-backed container runtime cannot be
  added to them either. The reference also lists Intel macOS labels. Community
  reports in search results say an Intel runner can run Colima; this was not
  checked in a workflow and is not relied on, which is why a macOS runner that
  can run the stack is a revisit trigger.
- **Maestro.** Its documentation describes it as "a black-box testing framework
  that simulates user interactions at the device level", reading the
  accessibility tree and sending taps and text input, with a small companion
  driver app on the device and nothing said to be compiled into the app under
  test. Its README states the Apache 2.0 licence, that flows run on any
  emulator, simulator, browser or physical Android device, that "Physical iOS
  devices are not yet supported", and that Maestro Cloud is paid. Its iOS page
  covers simulators managed by Xcode. Its React Native page states full support
  for React Native on both platforms and compatibility with Expo development
  builds.
- **Expo's guides.** The unit-testing guide installs `jest-expo` and Jest
  with a one-line `"preset": "jest-expo"` configuration, installs React Native
  Testing Library, and says "end-to-end tests" are preferred over snapshot unit
  tests for UI; it does not mention Vitest. The guide for running Maestro keeps
  the flows in a `.maestro` directory and needs a built `.apk` or `.app`.
- **Detox.** Its introduction describes a "gray box" approach, and its
  project-setup guide lists the Android changes named under Alternatives
  considered. That guide's iOS section describes a `pod install` and build
  command configuration, not framework linking, so the instrumentation cost is
  stated here for Android only.
