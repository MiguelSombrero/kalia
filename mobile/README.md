# Kalia mobile app

The Expo app, a development build rather than Expo Go
([ADR-0094](../docs/adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
Its shape is [architecture.md §5](../docs/architecture.md#the-mobile-app).

## Set up a Mac

Versions live in the files that pin them. Run `make mobile-doctor` after each
step: it names what is missing or wrong.

1. **Node** per [`.node-version`](../.node-version) and **Docker** Desktop.
2. **Xcode** per [`.xcode-version`](../.xcode-version): open it once to accept
   the licence, add a Simulator runtime, then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
3. **CocoaPods:** `brew install cocoapods`.
4. **The Zulu JDK** per [`.java-version`](.java-version):
   `brew install --cask zulu@$(cat mobile/.java-version)`. Never in `JAVA_HOME`
   in your profile (the backend's JDK is [its own](../backend/README.md); [Traps](#traps--do-not-fix-these)); the targets set it.
5. **Android Studio:** `brew install --cask android-studio`, open it once, install
   the SDK pieces the doctor names and a **Pixel** AVD with the image it names.
6. **`ANDROID_HOME`,** in your profile: `export ANDROID_HOME=$HOME/Library/Android/sdk`
   and `export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator`.
7. **`npm ci`** per checkout and after a lockfile change.

`ios/` and `android/` are generated: never edit them; delete them to start clean.

## Run the app

Start the stack first ([root README](../README.md#run-locally): `make stack-env`
in a worktree, which gives Metro its own port too, then `make up`), then check
the toolchain:

```bash
make mobile-doctor
make mobile-ios       # build the development build, run it on the iOS Simulator
make mobile-android   # the same on the Android emulator
```

Both start Metro detached, install, launch and **return**; extra `expo run` flags
go in `ARGS`: `make mobile-ios ARGS="--device 'iPhone 17e'"`.
Release targets: `mobile-ios-release`, `mobile-android-release`, `mobile-ios-device-release`.

- **iOS** reaches the Mac's `localhost` directly; **Android** gets `adb reverse` for the
  API's, Keycloak's and Metro's ports from this worktree's `.env` (Keycloak must be
  `localhost:<port>`, the issuer is pinned).

**Metro and builds never block a tool call.** `make mobile-metro-up` starts Metro
detached on this worktree's own `METRO_PORT` (8081 is Keycloak's: never type a
port), returning once `/status` answers or failing with the log's tail after
120 s; `make mobile-metro-down` stops only that one (after a mode switch: `down`,
then `up ARGS="--clear"`). `make mobile-start` is the foreground Metro for a
human's terminal. Waiting on anything else: [the worktree skill](../.claude/skills/worktree/SKILL.md#waiting-on-a-background-command).

Feed, Catalog, Cellar and Profile are tabs; the central Add action opens a
sheet and points to the catalog until scanning arrives. Signed-out Cellar and
Profile open a sign-in sheet from their current context; credentials stay in
the system browser ([ADR-0109](../docs/adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)).

### When it does not work

- **A build fails naming no version:** run `make mobile-doctor`.
- **`PluginError: Failed to resolve plugin for module "expo-…"`** or `Cannot find
  module`: `node_modules` is stale. `npm ci` at the root.
- **`pod install` encoding error:** by hand it needs `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- **Red "could not connect to Metro" on Android** after launching from the
  emulator's home screen: reopen it with the deep link, using `METRO_PORT`:

  ```bash
  adb shell am start -a android.intent.action.VIEW -d "exp+kalia://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<METRO_PORT>"
  ```


### Reading an installed build's errors

Read the device's own log ([ADR-0098](../docs/adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)):
`deviceLog.ts` writes a JSON line per failure. `Reference: <id>` on an error
screen is a traceId to grep in the backend's JSON log.

- **iPhone or Simulator:** Console.app, process `Kalia`, search `"level":"error"`; or
  `xcrun simctl spawn booted log stream --predicate 'process == "Kalia"'`.
- **Android:** `adb logcat '*:S' ReactNativeJS:V`; a native crash is in the unfiltered output.

## Install on an iPhone

1. **Sign in to Xcode with an Apple ID** (Settings > Accounts > **+**): its free
   **Personal Team** needs no program, card or Expo account; its limits are in
   [the backlog](../docs/tasks/backlog.md#mobile-client).
2. **Put the Team ID in this checkout's root `.env` only,** never in a commit, PR
   or message. It is the `OU` of the *Apple Development* certificate, not the
   value in parentheses after your name (no certificate: Accounts > Manage
   Certificates > **+** > Apple Development).

   ```bash
   security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject
   echo 'KALIA_APPLE_TEAM_ID=<the OU value>' >> .env
   ```
3. **Trust and Developer Mode.** Connect the phone, unlock it, tap **Trust**;
   Settings > Privacy & Security > Developer Mode > on, restart, **Turn On**
   ([Expo's iPhone setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build&buildEnv=local)).
   Xcode > Window > Devices and Simulators should list it.
4. **Check the mode** ([ADR-0097](../docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)):
   by default the origins are `localhost`, the phone itself, so the app opens
   but neither signs in nor lists beers. Use [phone mode](#reach-the-stack-from-the-iphone).
5. **Build and install,** with the Apple ID still signed in to Xcode:

   ```bash
   make mobile-doctor ARGS=ios-device
   make mobile-ios-device
   ```

   The phone is checked before the prebuild and again before the install, and
   kept awake between; unplugged, the target fails in seconds. The
   `expo-dev-launcher` "Script has ambiguous dependencies" warning is harmless.
6. **Trust the developer on the phone.** A refused first launch is expected:
   Settings > General > VPN & Device Management > the Apple ID > **Trust**, then
   open Kalia, which shows the Expo development launcher.

### Reach the stack from the iPhone

Over your own Tailscale tailnet (ADR-0097); its and the Mac's names live in the
root `.env` alone.

1. **Install Tailscale** on the Mac ([`.tailscale-version`](../.tailscale-version))
   and the iPhone, in one account; enable Serve if `tailscale serve` prints a link.
2. **Turn phone mode on** with the Mac's *short* name, the first column of
   `tailscale status` (one word, not the display name):

   ```bash
   make phone-mode HOST=<the Mac's name from tailscale status>
   make mobile-doctor ARGS=phone
   ```

   The short name is required: ATS exempts single-label hosts, not `*.ts.net`.
   It replaces the machine's `tailscale serve` forwards with this stack's four
   ports, so turning another worktree on replaces them.
3. **Start Metro with the origins cleared:** `make mobile-start ARGS="--clear"`.
4. **Open Kalia,** scan Metro's QR code or enter `http://<name>:<METRO_PORT>`;
   sign in as the seeded dev account, open Catalog, sign out.
5. **Turn it off** with `make phone-mode-off`. Switching changes the issuer, so
   the app signs in again.

In phone mode the Mac's browser signs in at `http://<name>:<WEB_PORT>`, the Android
emulator is refused (`mobile-android`, `mobile-e2e`) and the iOS Simulator needs a build made while it is on.

### A release build on the iPhone

No Metro, launcher or dev menu, but the Mac must be on with the stack up. Its
origins are fixed at build time, so it needs phone mode and refuses without it:

```bash
make mobile-doctor ARGS=phone
make mobile-ios-device-release
```

It installs over a development build, keeping the data. With Metro off, Kalia
opens to the app and Catalog lists beers. Changing the phone mode or name needs a rebuild.

### Re-signing after seven days

The install stops opening after seven days: rebuild with `make mobile-ios-device`,
the phone connected and `.env` in the mode to install. **Unobserved:** nobody
has watched an expiry or a re-sign ([the backlog](../docs/tasks/backlog.md#mobile-client)).

## Build variants, version and build number

A **development build** loads JavaScript from Metro, a **release build** has it
inside; both are built locally, origins inlined at build (EAS needs an Expo login, ADR-0094).

| Target | Variant | Origins it dials |
| --- | --- | --- |
| `make mobile-ios` | development, iOS Simulator | `localhost`; the tailnet host in phone mode |
| `make mobile-ios-release` | release, iOS Simulator | the same |
| `make mobile-ios-device` | development, iPhone | the tailnet host in phone mode; `localhost` otherwise, which on a phone is the phone |
| `make mobile-ios-device-release` | release, iPhone | the tailnet host; refuses without phone mode |
| `make mobile-android` | development, Android emulator | `localhost` through `adb reverse`; refuses in phone mode |
| `make mobile-android-release` | release, Android emulator | `localhost`; refuses in phone mode |

Every target prebuilds on every run, so a build never inherits the last one's
exception, origins or build number; `scripts/check-cleartext.mjs` checks the result.

**Cleartext HTTP has two allowed cases** ([ADR-0097](../docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)),
written by `plugins/withCleartextExceptions.js`; never `usesCleartextTraffic` or
`NSAllowsArbitraryLoads`, which the check fails:

- **Android:** `localhost` under `KALIA_E2E=1`, in a network security config that refuses plain HTTP elsewhere.
- **iOS:** the host in `KALIA_PHONE_HOST` in phone mode, an ATS exception for that host alone.

**The version is raised by hand** in `app.json`: patch for a fix a person would notice, minor a feature, major a break. **The build number is
never edited:** `app.config.js` derives it at prebuild. To require a build, read
its number on the Profile tab and run `make app-config IOS=<number>
ANDROID=<number>`: every earlier build is blocked
([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).

## Icon, splash and name

Rendered from `web/app/icon.svg`, never committed; `npm run assets --workspace
mobile` renders them before a hand prebuild. **After the mark, `app.json` or
`locales/` changes, run `npx expo prebuild --clean`** in `mobile/`
([Traps](#traps--do-not-fix-these)). Change the identifier `fi.kalia.app` only with the product owner.

## Test and checks

```bash
make mobile-lint   # ESLint (module boundaries included) and strict tsc
make mobile-test   # Jest + React Native Testing Library, and the icon render test; no simulator
```

Neither needs Docker or a native build: `make verify-fast` runs them, and the
`mobile` CI job on a change under `mobile/` or `packages/`. Run the whole gate
([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

## Upgrade the Expo SDK

Dependabot ignores the SDK's set (`expo`, `expo-*`, `jest-expo`, `eslint-config-expo`,
`react-native`, `react-native-screens`, `react-native-safe-area-context`,
`@react-native-async-storage/async-storage`); they move one SDK at a time, per
[Expo's walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/):

```bash
(cd mobile && npm install expo@^NN.0.0)   # NN: the next SDK
(cd mobile && npx expo install --fix)     # every package onto that SDK's versions
(cd mobile && npx expo-doctor)
```

**`--fix` also moves `react` and `typescript`:** put them back, both follow the web
([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)).

## End-to-end flow

```bash
node scripts/mobile-e2e.mjs install-maestro   # once: the pinned Maestro, checksum-verified, cached under ~/.cache/kalia
make mobile-e2e                               # starts and seeds the stack, then runs the flows on every platform this host has
```

It builds a release app and runs `.maestro/` on each platform present, failing
when none ran ([ADR-0096](../docs/adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
`--platform ios|android` picks one; `KALIA_E2E_IOS_DEVICE` (default `iPhone 17`, or
a UDID) and `KALIA_E2E_AVD` pick the device. `maestro-output/` is gitignored.
`Infrastructure failure, not the app` in CI means re-run, not debug
([ci-playbook](../docs/ci-playbook.md#mobile-e2e-maestro-android)).

- **A flow** crosses a boundary Jest cannot (release build, stack, browser),
  prefers a test id, starts with `launchApp: clearState: true`, depends on no
  other flow, and **is confirmed to fail** against a build that breaks its check.

## Conventions

The app follows [web/README.md](../web/README.md) wherever a rule is not about the browser.

- **Layers.** `src/app/` route files only re-export a screen from
  `src/features/<feature>/index.ts`; a feature never imports another; the update, maintenance and
  crash screens import nothing that can change under an installed build (`independentScreenFiles`, [ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)). ESLint enforces both; a new policy gets a fixture in `eslint-fixtures/` ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **A label or colour per API enum value comes from `enumLookup()`** in
  `@kalia/api`, never a `Record` keyed by the enum (ESLint,
  [packages/README.md](../packages/README.md)): an installed app outlives the
  backend build it was written against.
- **A route file never holds a test:** Expo Router makes every file under `src/app/` a route.
- **Arrow functions, no classes, `type` over `interface`, no `console.*`**
  ([ADR-0037](../docs/adr/0037-functional-modules.md),
  [ADR-0013](../docs/adr/0013-logging-conventions.md)); the device log goes
  through `src/lib/log/deviceLog.ts`, which takes fields, never an object.
- **A call that reads a status as an answer declares it, in its feature's
  `api.ts`:** `getBeer(id, { answers: [404] })`. The transport logs every other
  status of 400 or above as an error and a declared one not at all; declare
  only what the screen shows as an answer, never a status to quieten a log. It
  logs the route template, never the path, so a user's name stays out of the
  device log ([ADR-0013](../docs/adr/0013-logging-conventions.md)).
- **UI state in a feature-scoped Zustand `store.ts`,** never API data ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **The generated client is reached only through a feature's `api.ts`,** never
  edited, regenerated with `make api-drift` ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **No origin or port is written in the app:** `src/lib/config/origins.ts` reads
  `EXPO_PUBLIC_*` and throws at start-up when one is missing.
- **Tokens live only in `expo-secure-store`,** never AsyncStorage, a query cache
  or a log, and an API call gets its token only from `src/lib/auth/`
  ([ADR-0095](../docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- **The token store is a state machine** with storage, OAuth client and clock
  injected; refresh is single-flight, the new refresh token stored first. A 4xx
  refusal ends the session; any other failure leaves the user signed in.
- **A change of viewer resets the whole query client** (`src/lib/query/clearOnViewerChange.ts`,
  wired in `AppProviders`): sign-in, sign-out and a refresh the server refuses
  all pass through the token store. A query key therefore need not name the
  viewer, and a hook that caches viewer-dependent data needs no guard of its
  own. Reset, not `clear()`: tabs stay mounted and would keep showing the last
  viewer's data.
- **The transport** (`src/lib/api/registerTransport.ts`) retries a `401` once after the shared refresh, one `traceparent` per call
  ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- **The launch check reads `GET /api/v1/app-config`,** remembers the minimum build, and fails open when unreachable (ADR-0093).
- **A country is named by `src/lib/i18n/countryNames.ts`, never `Intl.DisplayNames`:** Hermes on iOS answers a bare code (ADR-0079).
- **Every string comes from `@kalia/locales`** ([ADR-0011](../docs/adr/0011-i18next-localization.md)).
- **Motion and haptics:** use `src/lib/motion/`'s tokens and primitives, never a literal;
  `haptic()` is for an action's result, and needs the iPhone's System Haptics and
  Vibration both on ([ADR-0113](../docs/adr/0113-the-phone-moves-a-little-to-explain-a-change-and-is-felt-only-for-the-result-of-an-action.md)).
- **Primitives live in `src/components/`;** a control moves there when a second screen
  uses it, its tests with it. A feature-only one (the catalog's chips) stays.
- **WCAG 2.2 AA** ([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)):
  tabs have accessibility labels, headings the heading role, no `allowFontScaling={false}`.
- **Use the generated semantic theme for static styling**, selecting colours
  with `useColorScheme`. The face is Bricolage Grotesque, bundled and loaded
  behind the splash screen by `FontGate`; set text with `textStyle(token, weight)`,
  never a size or `fontWeight` by hand, because the face has one file per weight.
  A beer's colours come from `useBeerStyleColours`, which falls back to the
  neutral pair ([ADR-0110](../docs/adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)).
  The app follows the system's light or dark setting; every colour is read
  through `useThemeColors`, never a mode's value by name, and in dark a beer is a
  neutral card with its style colour as a slab
  ([ADR-0112](../docs/adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)).
  Edit `packages/tokens/src/tokens.ts` and regenerate with
  `node scripts/generate-tokens.mjs`; never edit generated files. Runtime
  platform values remain allowed; a value without a semantic token needs a
  reasoned `token-exception` ([ADR-0066](../docs/adr/0066-token-only-styling-is-a-build-check.md),
  [ADR-0107](../docs/adr/0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md)).

## Traps — do not "fix" these

- **`JAVA_HOME` in your profile:** the backend builds on its own JDK; the targets set it.
- **`prebuild` without `--clean`** keeps the old icon and splash after mark, `app.json` or `locales/` changes.
- **`expo install --fix` moves `react` and `typescript`:** put them back.
- **React's render-error `console.error`** is not scrubbed and carries absolute host paths.
- **The Mac's short MagicDNS name,** not `*.ts.net`: ATS exempts single-label hosts only.
- **`usesCleartextTraffic` or `NSAllowsArbitraryLoads`** opens every host.
