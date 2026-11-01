# Task 05: A development build and a release build run on both platforms

- **Status:** needs-refinement
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
[task 02](02-the-phone-reaches-the-stack.md) gives each. The rules for when the
version and the build number change are written down and applied.

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

## Open questions

1. **Version rules.** Semantic version by hand, or tied to iterations; the
   build number raised by hand per install, derived from the commit count, or
   from a timestamp — and whether the two platforms share one number.
2. **Where the number is raised:** in `app.json` by a commit, or injected at
   build time so that `app.json` never drifts from what was installed.
3. **Make targets:** one target per platform and variant, or one target with
   arguments, and what the doctor checks for a release build.
4. **The end-to-end build:** does it become an instance of the new release
   variant with `KALIA_E2E=1`, or stay a separate path?
5. **What "runs" means for DW-4:** launch, sign in and list the catalog on
   each, or launch alone.

## Acceptance criteria

- [ ] A release build launches on the iPhone and on the Android emulator with
      no Metro running and no dev menu, signs in and lists the catalog —
      verified by hand and described in the PR
- [ ] A development build still runs on both simulators through the existing
      `make` targets
- [ ] A test fails a release build configured with the cleartext exception
      outside `KALIA_E2E=1`, and a test covers how the build number is
      derived or checked
- [ ] The version and build-number rules are written down in
      `mobile/README.md`
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks.
