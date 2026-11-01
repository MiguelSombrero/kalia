# Kalia mobile app

The Expo app, a development build rather than Expo Go
([ADR-0094](../docs/adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
Its shape — layers, origins, transport, strings — is
[architecture.md §5](../docs/architecture.md#the-mobile-app). This file takes a
Mac with none of the native toolchain to the app running on the iOS Simulator
and the Android emulator against the local stack, then lists the checks and
conventions.

## Set up a Mac

Each tool is named here and its version lives in the one file that pins it, so
this section never goes stale; `make mobile-doctor` reads those files and
tells you, by name, what is missing or the wrong version. Run it after each
step, and before asking why a build failed.

1. **Homebrew, Node and Docker.** Node is the version in
   [`.node-version`](../.node-version), and Docker Desktop runs the stack; both
   are needed for the web app already.
2. **Xcode,** the version in [`.xcode-version`](../.xcode-version) or a later
   minor of it, from the App Store. Open it once to accept the licence, then
   point the command-line tools at it and install an iOS Simulator runtime
   (Xcode > Settings > Components):

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

3. **CocoaPods.**

   ```bash
   brew install cocoapods
   ```

4. **A JDK for the Android build,** the major version in
   [`mobile/.java-version`](.java-version) — the one React Native's Gradle
   build needs, which is not the backend's.

   ```bash
   brew install --cask zulu@$(cat mobile/.java-version)
   ```

   Do not put it in `JAVA_HOME` in your shell profile: the backend builds on
   its own JDK ([backend/README.md](../backend/README.md)). The `make`
   targets below set `JAVA_HOME` for the Android build only.
5. **Android Studio,** then open it once and take the standard installation,
   which downloads the SDK.

   ```bash
   brew install --cask android-studio
   ```

   In Settings > Android SDK install the SDK Platform, Build-Tools,
   Platform-Tools and Emulator the doctor names. In Device Manager create a
   **Pixel** with a Google APIs arm64 system image of the API level the doctor
   names — the reference Android device. Add the SDK to your shell profile:

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```

6. **Dependencies,** once per checkout (a git worktree needs its own):

   ```bash
   npm ci
   ```

The reference devices are the iPhone simulator Xcode creates by default and the
Pixel above. `ios/` and `android/` are generated from `app.json` by the build
targets and ignored by git; never edit them, delete them to start clean.

## Run the app

The app needs the stack, whose API and Keycloak it dials:

```bash
make stack-env   # in a git worktree only: its own ports, Metro's included
make up
make mobile-doctor
```

Then, for the platform you want (or both, side by side):

```bash
make mobile-ios       # build the development build, run it on the iOS Simulator
make mobile-android   # the same on the Android emulator
```

Each target starts Metro on this worktree's `METRO_PORT` with the stack's
origins in the environment, builds the native project, installs the app and
opens it. The first build takes several minutes; later ones reuse the generated
project. Extra `expo run` flags go in `ARGS`, for example to pick a simulator:
`make mobile-ios ARGS="--device 'iPhone 17e'"`.

- **iOS** reaches the Mac's `localhost` directly, so nothing is forwarded.
- **Android** has a network of its own. `make mobile-android` starts the
  emulator if none is running, then runs `adb reverse` for the API's, Keycloak's
  and Metro's ports — the three the app dials — each from this worktree's
  `.env`, so two worktrees' stacks can run on one emulator. Keycloak's must be
  reachable as `localhost:<port>`, because the issuer is pinned to that name
  ([task 13](../docs/tasks/iteration-9/13-keycloak-mobile-client.md)).

After the first build, `make mobile-start` alone starts Metro for a build that
is already installed: open the app on the simulator and it connects.

Metro has a port of its own because its default, 8081, is Keycloak's default
host port. `make stack-env` allocates it beside the stack's ports; never type
one.

### When it does not work

- **A build fails with a message that names no version:** run `make
  mobile-doctor` first. A Gradle or CocoaPods failure on the wrong toolchain
  rarely says which tool was wrong.
- **`pod install` fails** with an encoding error: the target sets a UTF-8
  locale for it, but running `pod install` by hand needs
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- **The app opens to a red "could not connect to Metro" screen on Android,**
  usually after launching it from the emulator's home screen rather than
  through `make mobile-android`: the dev build forgot Metro's address. Reopen
  it with the deep link, using this worktree's `METRO_PORT`:

  ```bash
  adb shell am start -a android.intent.action.VIEW -d "exp+kalia://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<METRO_PORT>"
  ```

- **The emulator's ports clash with another worktree's:** `adb reverse --list`
  shows every forward on the emulator. Two worktrees never share a port, so a
  duplicate means one of them pinned a port by hand.
- **Disk:** `ios/`, `android/`, Gradle's cache and the emulator image are large;
  `docker compose down` (no `-v`) in a worktree you are done with frees the
  stack's share.

### Reading an installed build's errors

A release build has no Metro terminal and no red screen, and Kalia runs no crash
service: the device's own log is where a developer reads an error
([ADR-0098](../docs/adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).
The app writes no token, query string or user identity there, and a failed
request's error names its trace id: search the backend's JSON log for that id
to find its line ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

- **iPhone:** connect it to the Mac and trust the Mac, then open Console.app and
  pick the phone in the sidebar, or open Xcode's Window → Devices and
  Simulators, select the phone and choose Open Console. Filter on the process
  name, `Kalia`. The iOS Simulator logs to the Mac's own log, in the same
  Console.app.
- **Android:** `adb logcat` reads the device or emulator, with USB debugging on
  for a phone. `adb logcat '*:S' ReactNativeJS:V` keeps the JavaScript's lines
  only; a native crash is in the unfiltered output.

A native crash leaves only what the operating system itself logs: the app
closes, and no screen of Kalia's says so.

## Test and checks

```bash
make mobile-lint   # ESLint (module boundaries included) and strict tsc
make mobile-test   # Jest + React Native Testing Library, no simulator
make mobile-start  # Metro on METRO_PORT, with this checkout's stack as the origins
```

Both checks need neither Docker nor a native build, so `make verify-fast` runs
them and the `mobile` CI job runs them on a change under `mobile/` or
`packages/`. Run the whole gate rather than these alone
([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

## Upgrade the Expo SDK

Dependabot ignores the packages the SDK pins (`expo`, `expo-*`, `jest-expo`,
`eslint-config-expo`, `react-native`, `react-native-screens`,
`react-native-safe-area-context` and
`@react-native-async-storage/async-storage`), because they work only as the
SDK's set. They move with a deliberate upgrade, one SDK at a time, following
[Expo's walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/):

```bash
(cd mobile && npm install expo@^NN.0.0)   # NN: the next SDK
(cd mobile && npx expo install --fix)     # every package onto that SDK's versions
(cd mobile && npx expo-doctor)
```

`--fix` also moves `react` and `typescript` to the SDK's versions; both follow
the web instead ([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)),
so put them back before committing. The required Android end-to-end job builds
the result. A CVE in an ignored package still fails the vulnerability scan
([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)), which is
what forces a fix between upgrades.

## End-to-end flow

```bash
node scripts/mobile-e2e.mjs install-maestro   # once: the pinned Maestro, checksum-verified, cached under ~/.cache/kalia
make mobile-e2e                               # starts the stack, then runs the flow on every platform this host has
```

`make mobile-e2e`, which `make verify` includes, builds a **release** app — the
project `expo prebuild` generates, with its JavaScript inside, so no Metro
server runs — installs it on the iOS Simulator and on the Android emulator
when each is there, and runs the flows in `.maestro/` against the stack. It
prints which platform ran and which it skipped and why, and fails when none
ran ([ADR-0096](../docs/adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
One platform: `node scripts/mobile-e2e.mjs --platform ios|android`. The iOS
device is `iPhone 17` unless `KALIA_E2E_IOS_DEVICE` names another (or a UDID);
the Android one is a running emulator, else the first virtual device, or
`KALIA_E2E_AVD`. Maestro's reports and screenshots land in
`maestro-output/`, which is gitignored.

- **A flow** selects by visible text, accessibility label or test id, starts
  with `launchApp: clearState: true` and depends on no other flow. The Catalog
  flow looks for `beer-row`, the test id of a catalog row, so it holds for any
  catalog the seed allows; a flow that names data is fixed against the running
  stack, so prefer a test id.
- **CI boots the emulator itself.** `node scripts/mobile-e2e.mjs
  prepare-emulator` installs the system image and creates the virtual device,
  then `test --platform android --headless` boots it and waits for it to be
  healthy before the flow: adb lists it attached, `sys.boot_completed` is set
  and the package manager answers, several times in a row, and the guest's
  one-minute load average is below one (waited on for at most three minutes,
  then logged and used), again after the app is installed. An emulator that never gets there is stopped and booted once
  more; after the second attempt the job fails with `Infrastructure failure,
  not the app` at the top of the log. The flow is never retried. The emulator's
  own log is `maestro-output/emulator-<attempt>.log`, which the job uploads on
  failure.
- **Cleartext HTTP is allowed in the Android end-to-end build only.** The app
  dials `http://localhost` (the emulator reaches the stack through `adb
  reverse`), which a release build refuses, so `scripts/mobile-e2e.mjs` runs
  the prebuild with `KALIA_E2E=1`, which `plugins/withE2eCleartext.js` turns
  into the manifest flag; a prebuild without it takes the flag out again. iOS
  allows `localhost` by default.
- **A new flow is confirmed to fail** against a build with the thing it checks
  broken, so a pass means something.

## Conventions

Rules for writing code here; each links the ADR holding the reasoning. The app
follows [web/README.md](../web/README.md) wherever a rule is not about the
browser, so a rule stated there and not below still binds.

**Structure**

- **Layers.** `src/app/` route files only re-export a screen from
  `src/features/<feature>/index.ts`; a feature owns its screens, hooks and
  `api.ts`, and never imports another feature; `src/components/` and `src/lib/`
  are shared. Enforced by ESLint (`eslint-plugin-boundaries` in
  `eslint.config.js`), and each policy has a fixture in `eslint-fixtures/` that
  breaks it, linted by `eslint.config.test.ts`; a new or rewritten policy gets
  one too ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **A route file never holds a test.** Expo Router treats every file under
  `src/app/` as a route; the test sits beside the screen in its feature.
- **Arrow functions, no classes, `type` over `interface`, no `console.*`** —
  enforced by ESLint, as on the web
  ([ADR-0037](../docs/adr/0037-functional-modules.md),
  [ADR-0013](../docs/adr/0013-logging-conventions.md)).

**Data and configuration**

- **The generated client is reached only through a feature's `api.ts`**, never
  edited by hand, and regenerated with `make api-drift` from the repository
  root ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **No origin or port is written in the app.** `src/lib/config/origins.ts`
  reads both from `EXPO_PUBLIC_*` variables that `make mobile-start` sets from
  the worktree's ports, and throws at start-up when one is missing.

- **Tokens live only in `expo-secure-store`**, never in AsyncStorage, a query
  cache or a log, and an API call gets its token only from the token store in
  `src/lib/auth/`. The username is read from the profile endpoint on each
  visit and not stored
  ([ADR-0095](../docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).

**UI**

- **Every string comes from `@kalia/locales`**, never a literal in a component
  ([ADR-0011](../docs/adr/0011-i18next-localization.md)).
- **WCAG 2.2 AA in platform terms**
  ([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): each
  tab has an accessibility label, headings carry the heading role, and no text
  sets `allowFontScaling={false}` — a lint rule.
- **Styling is plain `StyleSheet` until [iteration 11](../docs/tasks/iteration-11.md)**,
  which brings the token pipeline and the check that enforces it
  ([ADR-0066](../docs/adr/0066-token-only-styling-is-a-build-check.md)).
