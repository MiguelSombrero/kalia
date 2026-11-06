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

6. **Dependencies,** once per checkout (a git worktree needs its own), and again
   whenever a pull changes a `package.json` or `package-lock.json`:

   ```bash
   npm ci
   ```

The reference devices are the iPhone simulator Xcode creates by default and the
Pixel above. `ios/` and `android/` are generated from `app.json`,
`app.config.js` and the plugins by the build targets and ignored by git; never
edit them, delete them to start clean.

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
origins in the environment, prebuilds and checks the native project
([Build variants](#build-variants-version-and-build-number)), builds it, installs
the app and opens it. The first build takes several minutes. Extra `expo run`
flags go in `ARGS`, for example to pick a simulator: `make mobile-ios
ARGS="--device 'iPhone 17e'"`.

Each has a release variant, with the JavaScript inside and no dev menu or Metro:
`make mobile-ios-release`, `make mobile-android-release` and, on the iPhone,
`make mobile-ios-device-release`
([below](#a-release-build-on-the-iphone)).

- **iOS** reaches the Mac's `localhost` directly, so nothing is forwarded; in
  phone mode it dials the tailnet host instead
  ([below](#reach-the-stack-from-the-iphone)).
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
- **`PluginError: Failed to resolve plugin for module "expo-…"`** (or any
  `Cannot find module`) before the build starts: `node_modules` predates a
  dependency a pull added, and `make mobile-doctor` does not check it. Run `npm
  ci` from the repository root, then the target again.
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
The app writes one JSON line per failure to it, through `src/lib/log/deviceLog.ts`,
with no token, query string or user identity: a failed request is `Request
failed` (no answer: `kind` is `network` or `timeout`) or `Request answered with
an error status`, with its `method`, `path`, `status` and `traceId`, and an
uncaught JavaScript error is `Uncaught error`, with its `source` (`render` or
`global`), the error's `name` and `message` and its first stack frames. The
device keeps a line to about 1 KB, so the stack is last and short. The screen
that shows a failed request prints the same `traceId` as `Reference: <id>`, and
an uncaught error shows the restart screen with the build number: search the
backend's JSON log for the id to find its line
([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

- **iPhone:** connect it to the Mac and trust the Mac, then open Console.app and
  pick the phone in the sidebar, or open Xcode's Window → Devices and
  Simulators, select the phone and choose Open Console. Filter on the process
  name, `Kalia`, and search for `"level":"error"`: the app's lines are at error
  level, from the subsystem `com.facebook.react.log`: React Native writes
  `console.error` as an error the system keeps and shows by default, and
  `console.warn` as an info message it hides. The iOS Simulator logs to the Mac's own
  log, in the same Console.app, or from a terminal:

  ```bash
  xcrun simctl spawn booted log stream --predicate 'process == "Kalia"'
  ```

- **Android:** `adb logcat` reads the device or emulator, with USB debugging on
  for a phone. `adb logcat '*:S' ReactNativeJS:V` keeps the JavaScript's lines
  only; a native crash is in the unfiltered output.

A development build writes the same lines as warnings, to Metro's terminal.

**One line is not Kalia's and is not scrubbed.** For a render error React also
writes its own `console.error`, which shows the error and its component stack,
and a release build's frames there name the folder the app was built in by its
absolute path, home directory included. Clean such a line before it goes in a
pull request, a message or any other service (CLAUDE.md, host data); Kalia's
own `Uncaught error` line beside it carries bundle-relative frames only.

A native crash leaves only what the operating system itself logs: the app
closes, and no screen of Kalia's says so.

## Install on an iPhone

Xcode signs the development build for your own iPhone with the Personal Team
of a free Apple ID: no Apple Developer Program, no card, no Expo account. What
that account cannot do is recorded once, in
[the backlog's cost list](../docs/tasks/backlog.md#mobile-client): the install
expires after seven days, a device holds three such apps, and there is no push,
no universal link and no TestFlight. Following the routine below, a Mac with
the toolchain above takes an iPhone that has never run Kalia to Kalia installed.

1. **Sign in to Xcode with the Apple ID.** Xcode > Settings > Accounts > **+**
   > Apple ID. A **Personal Team** appears under it. Joining no program is the
   point.
2. **Put the team identifier in the root `.env`,** never in a commit, a pull
   request or a message. It is the 10-character `OU` of the *Apple Development*
   certificate for the team ([Apple's own answer](https://developer.apple.com/forums/thread/75415)
   on finding a Personal Team's ID; a free account has no web portal that shows
   it). If the Keychain has no such certificate yet, Xcode > Settings >
   Accounts > the Personal Team > Manage Certificates > **+** > Apple
   Development creates one. The value in parentheses after your name in the
   certificate's common name is not the team.

   ```bash
   security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject
   echo 'KALIA_APPLE_TEAM_ID=<the OU value>' >> .env
   ```

   `.env` is gitignored and belongs to one checkout: a git worktree has its own,
   separate from the main checkout's, and `make` reads the one in the directory
   it runs from. `make mobile-doctor ARGS=ios-device` and `make
   mobile-ios-device` exist only on a checkout that has this routine, so on
   `dev` they appear when it merges. `app.config.js` passes the variable to `expo prebuild`
   as `ios.appleTeamId`, so it survives the generated `ios/` being replaced.
   `make mobile-doctor ARGS=ios-device` names it when it is missing or
   malformed, and `make mobile-ios-device` refuses to build without it.
3. **Get the iPhone detected.** Connect it to the Mac with the cable, unlock it
   and tap **Trust** (Trust This Computer), and turn on Developer Mode:
   Settings > Privacy & Security > Developer Mode > on; the phone restarts, and
   after unlocking you confirm **Turn On** with the passcode
   ([Expo's iPhone setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build&buildEnv=local)).
   Xcode > Window > Devices and Simulators should list the phone as connected.
   `make mobile-ios-device` installs only on a physical iPhone and refuses,
   saying which of these is missing, when none is connected or Developer Mode is
   off; with two connected it asks you to unplug one. It never offers a
   simulator.
4. **Check the mode the root `.env` is in.** An installed app is built for one
   mode of the stack and signs in again after a switch
   ([ADR-0097](../docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).
   In the default mode the origins and Metro host are `localhost`, which on a
   phone name the phone itself: the build installs and opens, to the app or to
   the development launcher, and does not sign in or list beers. Phone mode
   ([Reach the stack from the iPhone](#reach-the-stack-from-the-iphone)) is what
   makes them reach the Mac.
5. **Build and install.** The Apple ID must still be signed in under Xcode >
   Settings > Accounts: the build uses it to create the app's provisioning
   profile.

   ```bash
   make mobile-doctor ARGS=ios-device
   make mobile-ios-device
   ```

   This runs `expo prebuild --platform ios` to put the team into `ios/`, then
   `xcodebuild` with `-allowProvisioningUpdates` and
   `-allowProvisioningDeviceRegistration` for the connected iPhone, which
   registers the phone and creates or renews the profile, and installs and
   launches the result with `xcrun devicectl`. `expo run:ios --device` is not
   used, because it asks for those two flags only while the Xcode project has no
   team, and `app.config.js` gives it one. Metro is not started; the first launch
   needs none, and `make mobile-start` starts it later. The first build takes
   several minutes. The build's identifier is `fi.kalia.app`, the one task 03
   fixed: the first install registers it under the Personal Team, and the
   phone treats any later build with the same identifier as an update that
   keeps the app's data.

   The build prints a warning, "Script has ambiguous dependencies … [Expo Dev
   Launcher] Strip Local Network Keys for Release". It comes from
   `expo-dev-launcher` and is harmless: it is not why a build fails, so read
   above it for the error.
6. **Trust the developer on the iPhone.** On a free Personal Team the first
   launch is refused, because the phone does not yet trust the developer:
   `make mobile-ios-device` finishes by saying the app is installed and to trust
   it, which is the expected outcome, not a failure. Settings > General > VPN &
   Device Management > the Apple ID under Developer App > **Trust**, then open
   Kalia. With no Metro running it opens to the Expo development launcher,
   "searching for development servers": the next section points it at one.

The scripted build and install above, with the trust step, were carried out
once on the product owner's iPhone on 2026-11-04: the build succeeded, the app
installed, and after trusting the developer it opened to the development
launcher.

### Reach the stack from the iPhone

The phone reaches the stack on the Mac over your own Tailscale tailnet, in an
opt-in phone mode ([ADR-0097](../docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).
Tailscale's free personal plan asks for no card. Nothing here is committed: the
tailnet's name and the Mac's live in the root `.env` alone.

1. **Install Tailscale** on the Mac (the version in `.tailscale-version` or a
   later 1.x) and from the App Store on the iPhone, and sign both in to the same
   account. `tailscale status` lists the Mac under its name. If `tailscale
   serve` later says Serve is not enabled for the tailnet, it prints a link:
   open it and enable it.
2. **Turn phone mode on** with the Mac's *short* name, the first label of its
   MagicDNS name (one word, no dots, no spaces: the first column of `tailscale
   status` for this Mac, not the machine's display name), in the checkout whose
   stack the phone should reach:

   ```bash
   make phone-mode HOST=<the Mac's name from tailscale status>
   make mobile-doctor ARGS=phone
   ```

   The short name matters for the development build: iOS's App Transport
   Security applies to fully qualified names such as `*.ts.net` and not to a
   single-label one, so plain HTTP to the short name needs no exception in the
   build. `make phone-mode` writes `KALIA_PHONE_HOST` to the root `.env`,
   recreates the services that carry it (Keycloak, the realm import, the backend
   and the web app), and replaces the machine's `tailscale serve` forwards with
   this stack's four ports: the web app's, the API's, Keycloak's and Metro's. A
   worktree in phone mode serves the phone; switching another worktree on
   replaces the first one's forwards. The doctor's `phone` check names Tailscale
   not running, phone mode off, and any of the three origins that does not
   answer.
3. **Start Metro with the origins cleared,** so the app is built from the
   tailnet origins and not the cached `localhost` ones:

   ```bash
   make mobile-start ARGS="--clear"
   ```

   In phone mode Metro listens on loopback only and advertises the tailnet host,
   so it is reachable from the tailnet through the forward only while this runs.
4. **Open Kalia on the iPhone** (installed as above) and, in the development
   launcher, scan the QR code Metro prints or enter `http://<name>:<METRO_PORT>`.
   Sign in as the seeded dev account, open the Catalog tab, and sign out.
5. **Turn it off** with `make phone-mode-off`, which clears the line, recreates
   the services and removes the forwards. Switching either way changes the
   issuer, so an installed app signs in again.

With phone mode on, the browser on the Mac signs in at the tailnet origin
(`http://<name>:<WEB_PORT>`), the iOS Simulator needs a build made while it is on
(`make mobile-ios` reads the same origins), and the Android emulator is not
supported: `make mobile-android` and `make mobile-e2e` refuse, naming `make
phone-mode-off`. A development build that cannot reach its API logs a `Request
failed` line to Metro's console, which names the path and trace id of the call
([below](#reading-an-installed-builds-errors)).

### A release build on the iPhone

A development build opens to the launcher and loads its JavaScript from Metro on
the Mac, so it stops working when `make mobile-start` does. A release build has
its JavaScript inside: no Metro, no dev menu, no launcher. It still dials the
API and Keycloak on the Mac's stack over the tailnet, so the Mac must be on with
the stack up and Tailscale running; what it no longer needs is Metro.

Its origins are fixed when it is built, so it needs phone mode, and
`make mobile-ios-device-release` refuses without it, saying so. With the phone
connected, the Apple ID signed in to Xcode and the team in the root `.env` (steps
1 to 3 above) and phone mode on ([Reach the stack](#reach-the-stack-from-the-iphone),
step 2):

```bash
make mobile-doctor ARGS=phone
make mobile-ios-device-release
```

It builds, installs and launches as `make mobile-ios-device` does, over the
development build if one is installed, and keeps the app's data. Trust the
developer on the phone if it asks (step 6 above). Then, with Metro not running:

1. Kalia opens to the app itself, not the development launcher, and shaking the
   phone opens no developer menu.
2. Sign in as the seeded dev account, open the Catalog tab: beers are listed.
3. The Profile tab ends with the version and the build number.

Switching phone mode off or onto another name changes the origins the build
dialled, so rebuild; the tailnet exception in the build is for that one name.

### Re-signing after seven days

The install stops opening seven days after it was signed. There is no renewal
short of the paid program, so the routine is a rebuild and reinstall from
source: `make mobile-ios-device` again with the phone connected and the root
`.env` in the mode you want installed (step 4), because the new build replaces
the old one. The build's `-allowProvisioningUpdates` is meant to renew the
profile. Put the reminder in your own calendar; no file here carries it.

**This routine has not been observed.** Nobody has yet watched an install
expire or re-signed one, so this README claims nothing about what the app does
when it expires, whether the re-sign works as written, or whether the cellar
survives it. The first real expiry is tracked in
[the backlog](../docs/tasks/backlog.md#mobile-client); this section is
corrected from what is seen then.

## Build variants, version and build number

Two variants are built on the developer's machine, with `expo run:*` and
Xcode; EAS Build is out because it needs an Expo login
([ADR-0094](../docs/adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
A **development build** has the dev menu and loads its JavaScript from Metro. A
**release build** has its JavaScript inside and no dev menu. Origins are inlined
at build time (`EXPO_PUBLIC_*`), so a release build's are fixed when it is made.

| Target | Variant | Origins it dials |
| --- | --- | --- |
| `make mobile-ios` | development, iOS Simulator | `localhost`; the tailnet host in phone mode |
| `make mobile-ios-release` | release, iOS Simulator | the same |
| `make mobile-ios-device` | development, iPhone | the tailnet host in phone mode; `localhost` otherwise, which on a phone is the phone |
| `make mobile-ios-device-release` | release, iPhone | the tailnet host; refuses without phone mode |
| `make mobile-android` | development, Android emulator | `localhost` through `adb reverse`; refuses in phone mode |
| `make mobile-android-release` | release, Android emulator | `localhost`; refuses in phone mode |

The Android release build is the end-to-end one `make mobile-e2e` runs and is
always `KALIA_E2E=1` on `localhost`; the iOS Simulator's `make mobile-e2e` leg is
a release build too.

**Every target prebuilds on every run.** `expo run:*` reuses an existing `ios/`
or `android/`, which would keep the last build's cleartext exception, origins
and build number, so each target runs `expo prebuild` for its platform first,
then `mobile/scripts/check-cleartext.mjs` on the result, then builds. A
development build made after an end-to-end one does not inherit its exception.

**Cleartext HTTP has two allowed cases and no others.** Both platforms refuse
plain HTTP in a release build unless the app declares an exception, and the
exception follows the host, not the build type
([ADR-0097](../docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).
`plugins/withCleartextExceptions.js` writes it at prebuild and takes it out of
any prebuild that does not ask for it:

- **Android: `localhost`, under `KALIA_E2E=1`,** in a network security config
  that refuses plain HTTP elsewhere. Never the app-wide
  `usesCleartextTraffic`. The emulator reaches the stack through `adb reverse`.
- **iOS: the tailnet host named by `KALIA_PHONE_HOST`, in phone mode,** as an
  App Transport Security exception for that host alone. iOS needs none for
  `localhost`, and nothing sets `NSAllowsArbitraryLoads`. Expo's stock
  `NSAllowsLocalNetworking` is left as generated.

Because one prebuild feeds a development and a release build alike, the iOS
exception is present in phone mode in either. The check fails a project with an
app-wide exception or one for any other host, and ignores Expo's `debug`
overlay on Android, which allows cleartext for Metro and is merged only into the
debug variant.

**The version is semantic and raised by hand** in `app.json`: patch for a fix
a person would notice, minor for a feature, major for a change that breaks what
was installed before. It is for people to read and the app-config check ignores
it. **The build number is never edited:** `app.config.js` derives it each time
the project is prebuilt, as the seconds since 2026-01-01 UTC, and writes the one
value to the iOS build number and to the Android version code. A later build is
always higher, two builds never share one, and the value stays under Android's
2,100,000,000 until 2092. The app shows it on the Profile tab, beside the
version, and the app-config check compares it with the server's minimum. To
require a build, read its number there and set it with `make app-config
IOS=<number> ANDROID=<number>`: every build made before that moment is then
blocked ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

## Icon, splash and name

The home-screen icon, the Android adaptive icon and the splash screen are
PNGs rendered from `web/app/icon.svg`, the mark, by
`mobile/scripts/render-assets.mjs` into `assets/generated/`. Nothing there is
committed: `npm run ios`, `npm run android` and `scripts/mobile-e2e.mjs` render
it before they prebuild, and `npm run assets --workspace mobile` renders it on
its own. A prebuild started any other way fails on the missing file, so run that
first. The icon is the mark full bleed; the adaptive foreground is the mark
inset to Android's safe zone over the mark's teal, which `app.json` names as the
adaptive background and a test pins to the SVG. The splash is the mark without
its tile on that teal, so the foam keeps its rounded bottom; Android 12 and
later crop it to a circle, which the image's margin is sized for. The display
name comes from `locales/en.json` and `locales/fi.json`, and the identifier
`fi.kalia.app` is in `app.json`.

The build targets prebuild on every run, but `expo prebuild` without `--clean`
keeps the icon and splash files already in `ios/` and `android/`, so after the
mark, `app.json` or `locales/` changes, run `npx expo prebuild --clean` in
`mobile/` (or delete both directories) before building, or the build keeps the
old icon and splash.

An installed build keeps the identifier, icon, splash and name it shipped with:
change one and reinstall, and change the identifier only with the product
owner, since the phone treats a new one as a different app.

## Test and checks

```bash
make mobile-lint   # ESLint (module boundaries included) and strict tsc
make mobile-test   # Jest + React Native Testing Library, and the icon render test; no simulator
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
  one-minute load average is below half its four cores (waited on for at most three minutes,
  then logged and used), again after the app is installed. Then Maestro
  launches Settings once, from `e2e-preflight/`, because the first command it
  sends a freshly booted emulator has failed with `device offline` while every
  check above passed; if that fails, the emulator counts as unhealthy. An
  emulator that never gets there is stopped and booted once
  more; after the second attempt the job fails with `Infrastructure failure,
  not the app` at the top of the log. The flow is never retried. The emulator's
  own log is `maestro-output/emulator-<attempt>.log`, which the job uploads on
  failure.
- **The end-to-end build is the release variant.** On Android the app dials
  `http://localhost` (the emulator reaches the stack through `adb reverse`),
  which a release build refuses, so `scripts/mobile-e2e.mjs` prebuilds with
  `KALIA_E2E=1`, which `plugins/withCleartextExceptions.js` turns into an
  exception for `localhost` alone; the cleartext rule and its check are in
  [Build variants](#build-variants-version-and-build-number). iOS allows
  `localhost` by default.
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
  [ADR-0013](../docs/adr/0013-logging-conventions.md)). What the app writes to
  the device's log goes through `src/lib/log/deviceLog.ts`, the one exempt
  file; it takes fields, never an object a token or a user could be inside.

**Data and configuration**

- **Client UI state goes in a feature-scoped Zustand store**,
  `features/<feature>/store.ts`, never API data
  ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
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
- **The token store is a state machine with its storage, OAuth client and
  clock injected,** so a test drives expiry without a realm. A refresh is
  single-flight: calls that find the token expired together wait for one
  refresh, and the new refresh token is stored before the access token is
  handed out. A 4xx refusal (`invalid_grant` and the other RFC 6749 §5.2 codes)
  ends the session and raises a notice on the Profile tab; any other failure
  (no connection, a timeout, a 5xx, a 429) leaves the user signed in and sends
  the call without a token, and the store skips the refresh for 30 seconds.
  Signing out forgets the tokens on the device first, then revokes at Keycloak
  when it can.
- **The transport registers `@kalia/api`'s fetch core** with the API origin
  (`src/lib/api/registerTransport.ts`). A `401` makes it ask the store for one
  shared refresh and retry once; a second `401` is returned as it is. It starts
  a W3C `traceparent` per call and keeps it across the retry
  ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- **The launch check reads `GET /api/v1/app-config`** on launch and on
  returning to the foreground, at most every 30 seconds, and covers the whole
  app with an update-required or maintenance screen (maintenance first). It
  remembers the platform's minimum build, not a verdict, so an update demanded
  once keeps blocking offline; an endpoint that cannot be reached fails open
  ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

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
