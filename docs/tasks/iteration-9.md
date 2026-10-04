# Iteration 9 — Mobile foundations

Goal: an Expo app in the monorepo runs on the iOS Simulator and the Android
emulator against the local stack, signs in through Keycloak and shows real API
data — and the decisions a second client forces are recorded, with the repo,
the backend and the process reshaped to carry a third codebase.

## Done when

- **DW-1:** A developer following `mobile/README.md` on a fresh Mac gets the
  app running on both the iOS Simulator and the Android emulator.
- **DW-2:** On both, the app signs in through Keycloak, shows the signed-in
  user and a catalog list read from `/api/v1`, and signs out.
- **DW-3:** The app blocks itself behind an "update required" screen when the
  server says its version is below the minimum supported one.
- **DW-4:** `make verify` and CI cover the mobile app — lint, type check, unit
  tests and one native end-to-end flow — and the web app is still green after
  the repository is reshaped.
- **DW-5:** The mobile stack, repo layout, API compatibility policy, mobile
  authentication and mobile testing strategy are each a recorded decision.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)); until then
each is one line here. The five decisions come first, because every build task
below them inherits their answers.

- **Decision: the mobile stack** — Expo with a development build rather than
  Expo Go, Expo Router, TypeScript strict, local builds with no dependency on
  EAS's paid cloud; why not Flutter or two native apps.
- **Decision: repo layout and code sharing** — npm workspaces, `frontend/`
  renamed `web/` inside that same change, `mobile/`, and a `packages/`
  directory for what is genuinely shared (API types or client, i18n strings,
  design tokens).
- **Decision: the API compatibility policy** — `/api/v1` changes are additive
  only, what triggers `/api/v2`, a deprecation window; and whether
  [ADR-0012](../adr/0012-orval-api-client.md)'s rejection of a committed
  OpenAPI spec still holds with two generated clients.
- **Decision: mobile authentication** — a public `kalia-mobile` Keycloak client
  with PKCE and a `kalia://` redirect, its own `kalia-backend` audience mapper,
  `offline_access` and refresh-token lifetime, tokens in SecureStore, and the
  app ending its own session when a refresh fails.
- **Decision: the mobile testing strategy** — unit tests (Jest + React Native
  Testing Library), a native end-to-end tool (Maestro or Detox), and what CI
  runs on Linux for Android and on macOS for iOS.
- **The process carries a third codebase** — `mobile/CLAUDE.md` and
  `mobile/README.md` ([ADR-0035](../adr/0035-agent-context-layout.md)),
  `docs/architecture.md` §5 split into web and mobile, the check scripts and
  CI covering mobile, and CLAUDE.md gaining the Expo "check the docs, not
  memory" warning and the no-new-costs constraint.
- **Workspaces refactor** — npm workspaces and the `web/` rename, with CI, the
  Dockerfile, compose, the Makefile and the docs following; no behaviour
  change.
- **Shared packages** — generated API types and client from one spec with a
  mutator per platform, and the en/fi locale strings.
- **Developer environment** — Xcode, Android Studio, the simulators;
  `mobile/README.md` as the onboarding guide; Make targets.
- **App skeleton** — Expo Router with four tabs (Feed, Catalog, Cellar,
  Profile) over placeholder screens, safe areas, and the web's conventions
  carried over: TanStack Query behind feature hooks, Zustand, react-hook-form
  and Zod, i18next following the device locale, import boundaries per feature.
- **App-config endpoint** — `GET /api/v1/app-config` with the minimum
  supported version and a maintenance flag, checked by the app on launch and
  on resume. Has to exist before any build that could become v1.0
  ([backlog](backlog.md#must-exist-in-the-apps-first-release-or-never)).
- **Mobile-readiness fixes from the backlogs** — 401 answered as
  `problem+json` without losing `WWW-Authenticate`
  ([backlog](backlog.md)), and `/breweries` paginated
  ([quality backlog](quality-backlog.md) COULD-4).
- **The `kalia-mobile` Keycloak client** in `keycloak/realm-export.json`, under
  [ADR-0054](../adr/0054-keycloak-config-cli-realm-management.md)'s drift
  check, with a test that a mobile-shaped token passes the backend's audience
  check.
- **Sign-in on mobile** — sign in, silent refresh, sign out and expiry, on
  both simulators.
- **Walking-skeleton slice** — a catalog list on screen from the real API,
  covered by a unit test and one native end-to-end flow in CI.

The iOS Simulator reaches the Mac's `localhost` directly, and Keycloak's issuer
is already pinned to `http://localhost:8081`, so nothing in this iteration needs
the stack reachable from another device; the Android emulator gets the same
with `adb reverse`. A real phone is [iteration 10](iteration-10.md).
