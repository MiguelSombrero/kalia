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

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-9/01-claude-md-regains-its-headroom.md) | CLAUDE.md has room for what mobile adds to it | needs-refinement |
| [16](iteration-9/16-first-profile-reads-never-race.md) | Two first reads of a new user's profile never collide | needs-refinement |
| [17](iteration-9/17-dev-stays-green-and-its-failures-are-logged.md) | `dev` stays green after a merge, and a red `dev` is logged | needs-refinement |
| [18](iteration-9/18-docs-match-iteration-8-5.md) | The documentation says what iteration 8.5 built | needs-refinement |
| [19](iteration-9/19-review-feedback-outlives-its-pr.md) | What a review decides outlives the pull request it was made in | needs-refinement |
| [20](iteration-9/20-no-token-or-query-string-in-a-log.md) | No signed token or query string reaches a log | needs-refinement |
| [21](iteration-9/21-public-cellar-response-settled-before-the-freeze.md) | The public cellar's response is settled before `/api/v1` freezes | needs-refinement |
| [02](iteration-9/02-decision-the-mobile-stack.md) | Decide the mobile stack | needs-refinement |
| [03](iteration-9/03-decision-repo-layout-and-code-sharing.md) | Decide the repository layout and what code is shared | needs-refinement |
| [04](iteration-9/04-decision-api-compatibility-policy.md) | Decide the API compatibility policy | needs-refinement |
| [05](iteration-9/05-decision-mobile-authentication.md) | Decide how the mobile app authenticates | needs-refinement |
| [06](iteration-9/06-decision-mobile-testing-strategy.md) | Decide how the mobile app is tested | needs-refinement |
| [07](iteration-9/07-process-carries-a-third-codebase.md) | The process carries a third codebase | needs-refinement |
| [08](iteration-9/08-workspaces-refactor.md) | The repository is npm workspaces, with the web app in `web/` | needs-refinement |
| [09](iteration-9/09-shared-packages.md) | The API client and the locale strings are shared packages | needs-refinement |
| [10](iteration-9/10-developer-environment.md) | A developer can run the app on both simulators from the README | needs-refinement |
| [11](iteration-9/11-app-skeleton.md) | The app has four tabs and the web's conventions | needs-refinement |
| [12](iteration-9/12-app-config-endpoint.md) | The server can tell an old app to update, or that Kalia is down | needs-refinement |
| [13](iteration-9/13-keycloak-mobile-client.md) | Keycloak has a client for the app, and the backend accepts its tokens | needs-refinement |
| [14](iteration-9/14-sign-in-on-mobile.md) | A user signs in and out of the app | needs-refinement |
| [15](iteration-9/15-walking-skeleton-slice.md) | The Catalog tab lists real beers from the API | needs-refinement |

The table's order is the order of work. [01](iteration-9/01-claude-md-regains-its-headroom.md)
comes first because `CLAUDE.md` is full and [07](iteration-9/07-process-carries-a-third-codebase.md)
has to add to it. The quality tasks, 16–21, come next, then the five
decisions, 02–06, because every build task after them inherits their answers. Each decision has to be accepted before the
build tasks it binds are refined.

Tasks 16–21 were lifted from the [2026-10-27 sweep](quality-backlog.md) at the
product owner's request, chosen for their impact on the project's quality:
every open MUST, plus the SHOULDs that mobile makes worse or makes permanent.
They come before the decisions and the build work for three reasons. A flaky
test and a `dev` that goes red unnoticed (16, 17) undermine every gate after
them. The docs
(18) have to be right before [08](iteration-9/08-workspaces-refactor.md)
rewrites their paths. And the public cellar's response (21) has to settle
before [04](iteration-9/04-decision-api-compatibility-policy.md)'s policy
freezes it.

The 401 `problem+json` fix this list once carried moved to
[iteration 8.5 task 01](iteration-8.5/01-api-errors-complete-and-typed.md).

The iOS Simulator reaches the Mac's `localhost` directly, and Keycloak's issuer
is already pinned to `http://localhost:8081`, so nothing in this iteration needs
the stack reachable from another device; the Android emulator gets the same
with `adb reverse`. A real phone is [iteration 10](iteration-10.md).
