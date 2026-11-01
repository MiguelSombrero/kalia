# Task 05: A development build and a release build run on both platforms

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** DW-4

## Why

Every build a developer runs today is a development build: Metro serves the
JavaScript, the dev menu is on, and the app dies when the Mac's Metro stops.
The one release build is the Android end-to-end one (`make mobile-e2e`), built
with `KALIA_E2E=1` for cleartext to `localhost` and never installed anywhere
else. Nothing produces a release build for the iPhone, so the app on the
phone stops working the moment the laptop leaves the room, and nothing
checks that the bundled JavaScript behaves like the served one.

The version and build number are also unmanaged. `app.json` holds
`version: 0.1.0`, iOS `buildNumber: "1"` and Android `versionCode: 1`, while
the app-config check
([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md))
blocks a build whose number is below the server's minimum. With no rule for
raising it, two different installed builds can carry the same number, and the
check cannot tell them apart.

## Scope

A developer can build either a development build (dev menu, Metro) or a
release build (bundled JavaScript, no dev menu) for the iPhone, the iOS
Simulator and the Android emulator, with the origins
[task 02](02-the-phone-reaches-the-stack.md) gives each, and a release build
carries a cleartext exception for exactly the one host it dials over plain HTTP
and for no other. The rules for when the version and the build number change are
written down and applied.

## Non-goals

- Store builds, signing for distribution and over-the-air updates: parked for
  cost in [the backlog](../backlog.md#mobile-client).
- Where release-build errors are visible —
  [task 06](06-decision-error-visibility.md).

## Constraints

- Builds run on the developer's machine with `expo run:*`; EAS Build is out,
  even `--local`, because it needs an Expo login
  ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
- The build number is what the app compares with the server's minimum
  (`docs/architecture.md`, the app-config check); the Android and iOS numbers
  are separate columns.
- The end-to-end release build's cleartext exception is allowed only under
  `KALIA_E2E=1` and is removed by any other prebuild
  (`mobile/plugins/withE2eCleartext.js`); no other release build may carry it.
- `EXPO_PUBLIC_*` values are inlined at build time, so a release build's
  origins are fixed when it is built.
- Expo postdates model training — check docs.expo.dev at the SDK version in
  `mobile/package.json`, never memory.

**Decided at refinement, 2026-11-01** (product owner):

- **The version is semantic and raised by hand** in `app.json`. **The build
  number is derived at build time** from when the build is made — one number
  for both platforms, within Android's `versionCode` range — so `app.json`
  carries no build number and cannot drift from what is installed. The app
  shows its build number, on the Profile tab, so the product owner can read it
  before setting the server's minimum with `make app-config`.
- **The existing `make` targets gain a release variant;** the phone's target is
  [task 04](04-free-apple-id-signing.md)'s.
- **The end-to-end build becomes the release variant with `KALIA_E2E=1`,** and
  DW-4's Android run is that build on `localhost`.
- **The iPhone's release build uses phone mode's origins** with a cleartext
  exception scoped to the tailnet host ([task 01](01-decision-how-a-phone-reaches-the-mac.md)).
  A release build may carry a cleartext exception only for `KALIA_E2E=1`'s
  `localhost` or phone mode's tailnet host.
- **"Runs" means it launches, signs in and lists the catalog** on each, as the
  first criterion says.

**Fixed by [ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)**
(accepted 2026-11-01) and applied here:

- **Which build dials which origin.** With phone mode off, every target dials
  `localhost` with the stack's own ports: the iOS Simulator directly, the
  Android emulator through `adb reverse`. With it on, the iPhone and a
  phone-mode iOS Simulator build dial the tailnet origin the ADR defines, built
  from the one root-`.env` value and the stack's own ports. **The Android
  emulator is not supported in phone mode** (`adb reverse` forwards `localhost`
  only, and the issuer is no longer that name), so an Android build in phone
  mode stops before building and says so, rather than shipping an app that
  dials a name nothing there can reach. The Android release build is therefore
  always the `KALIA_E2E=1` one on `localhost`.
- **The exception follows the host, not the build type, and is written per
  platform.** Android's is `localhost` only, under `KALIA_E2E=1`, declared in a
  network security configuration for that host with plain HTTP refused
  elsewhere; it replaces `withE2eCleartext.js`'s app-wide
  `usesCleartextTraffic`, which permits every host. iOS's is the tailnet host
  only, in phone mode, declared as an App Transport Security exception for that
  host; iOS needs none for `localhost`, and never `NSAllowsArbitraryLoads`.
  Nothing else carries an exception, and the Android emulator never carries
  the tailnet one. The platform mechanics are checked against docs.expo.dev and
  Apple's and Android's own pages at implementation.
- **The tailnet exception is written by a config plugin from the root `.env`'s
  one value at prebuild,** as the end-to-end one is, and a prebuild with phone
  mode off removes it. One prebuild feeds both a development and a release
  build, so the exception is present in phone mode in either; the rule above
  limits it to phone mode, not to release.
- **Every build target prebuilds for its own variant, every time it runs.**
  `expo run:*` reuses an existing `ios/` or `android/`, and a reused project
  would keep the last build's cleartext exception, origins and build number: a
  development build made after an end-to-end one would still carry the
  localhost exception, and a default-mode build made after a phone-mode one the
  tailnet exception, with nothing failing.
- **The host name is a host detail** (the ADR's last point): tests and fixtures
  use an invented host, never the real one, and no committed file names it.
- **The build number is derived when the project is prebuilt,** one value
  written to both platforms' columns. It must rise with the time of the build,
  so a later build always compares higher, and stay within Android's
  `versionCode` range; the unit is the implementation's to choose within those
  two properties. The app reads it from the installed build
  (`expo-application`'s `nativeBuildVersion`, already a dependency and already
  what the app-config check compares). `app.json` becomes dynamic config so
  nothing is hand-edited.
- **The Profile tab shows the version and the build number,** worded in both
  locales through the shared locale package; an unknown build number is left
  out rather than shown as a placeholder.

## Open questions

**None.** Swept against the fixed taxonomy on 2026-11-01, after
[ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)
was accepted: the origins and the cleartext scoping come from the ADR and the
decisions above, and the rest of the taxonomy surfaced nothing a decision above
does not answer.

## Acceptance criteria

- [ ] A release build launches on the iPhone, in phone mode, with no Metro
      running and no dev menu, signs in and lists the catalog — verified by
      hand and described in the PR, with no host address or name in the
      description
- [ ] A release build launches on the Android emulator with no Metro running
      and no dev menu, signs in and lists the catalog, as `make mobile-e2e`'s
      Android leg does against `localhost`
- [ ] A development build still runs on the iOS Simulator and the Android
      emulator through the existing `make` targets, and `make mobile-e2e`
      passes on both, the iOS Simulator one as a release build
- [ ] A check over a generated native project fails one that carries a
      cleartext exception outside `KALIA_E2E=1`'s `localhost` (Android) or
      phone mode's tailnet host (iOS), including an app-wide one, and is
      unit-tested with fixture projects for each allowed and each forbidden
      case, using an invented host; every build target runs it after prebuild
- [ ] A test shows a build target prebuilds on every run, so an end-to-end or
      phone-mode project is not reused by the next build, and that an Android
      build in phone mode stops with a message saying why
- [ ] A test shows the build number rises with the time of the build, is the
      same value for both platforms and stays within Android's `versionCode`
      range, and `app.json` carries neither column
- [ ] The Profile tab shows the version and the build number, covered by a
      screen test, and omits the build number when it is unknown
- [ ] The version and build-number rules are written down in
      `mobile/README.md`, which also states the cleartext rule that replaces
      its "Android end-to-end build only" bullet
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks.
