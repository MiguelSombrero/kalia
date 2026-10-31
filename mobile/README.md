# Kalia mobile app

The Expo app, a development build rather than Expo Go
([ADR-0094](../docs/adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
Its shape — layers, origins, transport, strings — is
[architecture.md §5](../docs/architecture.md#the-mobile-app). Setting up the
toolchain and running it on the simulators is
[task 10](../docs/tasks/iteration-9/10-developer-environment.md)'s, and lands
in this file above the sections below.

## Test and checks

```bash
make mobile-lint   # ESLint (module boundaries included) and strict tsc
make mobile-test   # Jest + React Native Testing Library, no simulator
make mobile-start  # Metro, with this checkout's stack as the origins
```

Both checks need neither Docker nor a native build, so `make verify-fast` runs
them and the `mobile` CI job runs them on a change under `mobile/` or
`packages/`. Run the whole gate rather than these alone
([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

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

- **A flow** selects by visible text or accessibility label, starts with
  `launchApp: clearState: true` and depends on no other flow. The Catalog
  flow looks for a beer from the Wikidata import that sorts into the first
  rows; a flow that names data is fixed against the running stack.
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
