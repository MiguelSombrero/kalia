# Task 12: The server can tell an old app to update, or that Kalia is down

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-3

## Why

Once an app is installed, nothing can be added that the already-installed
version has to honour. A minimum-supported-version check and a maintenance
signal therefore ship in the app's first release or never
([backlog](../backlog.md#must-exist-in-the-apps-first-release-or-never)):
without the first, every future breaking change to the API is impossible for as
long as a v1.0 client is still calling it. No build is distributed in this
iteration, which is exactly why it has to exist now — before any build that
could become v1.0.

## Scope

`GET /api/v1/app-config` returns the minimum supported app version and a
maintenance flag. The app checks it on launch and on returning to the
foreground, and blocks itself behind an "update required" or "maintenance"
screen when the server says so.

## Non-goals

- Feature flags or remote configuration beyond these two signals.
- A link to an app store — there is none until the paid accounts in the
  [backlog](../backlog.md#mobile-client) are bought.

## Constraints

- [ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)
  says how the minimum build and a deprecation window work together: raising
  the minimum past the last build that uses a deprecated element is the only
  thing that permits removing it, and this endpoint is itself bound by the
  policy, which is why its two signals exist in the first release.
- Anonymous endpoints are bounded at the edge
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
  and request parameters are bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- Configuration follows [ADR-0015](../../adr/0015-configuration-strategy.md).
- The endpoint's errors are typed and documented like every other's
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).

**Decided at refinement, 2026-10-30** (product owner):

- **A new functional module owns it** — no existing module's
  responsibility is "what the server tells a client about itself"
  ([ADR-0037](../../adr/0037-functional-modules.md)).
- **The values live in a database table,** changed by an operator with SQL
  the way `make moderate` changes a beer's status, so maintenance can be
  raised mid-incident without a redeploy. Application configuration was
  rejected because raising maintenance would need a restart.
- **One minimum per platform,** iOS and Android. It has to exist in the
  first release: an installed app cannot learn a field added later.
- **The minimum is a build number** — a per-platform integer that only
  increases, assigned by [iteration 10](../iteration-10.md)'s build-variant
  rules. A semantic version was rejected as needing parsing in both tiers
  for a comparison an integer makes unambiguous.
- **An unreachable endpoint fails open:** the app keeps working, so an
  offline user keeps their cellar ([iteration 12](../iteration-12.md)). An
  "update required" the app has already been told is remembered and keeps
  blocking while offline.
- **The app owns both screens' wording, in en and fi;** the server sends no
  message text.
- **The web does not read the endpoint** in this iteration.

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)
was accepted:

- **The module is `appconfig`,** matching the endpoint. Its response is
  `{ "minimumBuild": { "ios": n, "android": n }, "maintenance": bool }`, read
  from a one-row table that starts at 0, 0 and false, so no build is blocked
  until an operator says so. The endpoint takes no parameters.
- **An operator changes the row with a `make` target in the style of
  `make moderate`,** and the backend README says how, so raising maintenance
  mid-incident is one command and not a hand-written statement.
- **The response is `Cache-Control: no-store`.** A raised minimum or a
  maintenance flag has to be seen at the next check, the backend sets no cache
  headers anywhere today, and the load is one small read per launch or
  foregrounding, bounded at the edge
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
- **The app checks on launch and on returning to the foreground,** at most
  once every 30 seconds, through a feature hook
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)).
- **The app compares its own build number with the minimum for its platform.**
  The build number is the iOS build number and the Android version code in
  `app.json`, both 1 in this iteration; [iteration 10](../iteration-10.md)
  sets the rules for raising them. The library that reads it, and the one
  that keeps the remembered minimum across launches, are new dependencies this
  task asks for when it starts (`CLAUDE.md`).
- **The app remembers the minimum the server named, not a verdict.** Installing
  a newer build therefore clears a remembered "update required" by itself,
  because the build number now meets the remembered minimum.
- **Maintenance wins while it is on:** updating the app does not help when
  the server is down. Otherwise "update required" shows.
- **Both screens offer "check again"** and cover the whole app, tabs included.
  The update screen has no store link, because there is no store yet.
- **The wording** is below. The strings go into the shared strings package in
  both languages ([task 09](09-shared-packages.md)).

  | Where | English | Finnish |
  |---|---|---|
  | Update required, title | Update required | Päivitys vaaditaan |
  | Update required, body | This version of Kalia is out of date. Update the app to continue. | Tämä Kalian versio on vanhentunut. Päivitä sovellus jatkaaksesi. |
  | Maintenance, title | Down for maintenance | Huoltotauko |
  | Maintenance, body | Kalia is being maintained and will be back soon. Try again in a moment. | Kalia on huollettavana ja palaa pian käyttöön. Yritä hetken kuluttua uudelleen. |
  | Action on both | Check again | Tarkista uudelleen |

- **Depends on [task 09](09-shared-packages.md) and
  [task 11](11-app-skeleton.md)** for the app half. The backend half needs
  neither, but the task is one pull request.

## Open questions

**None.**

## Acceptance criteria

- [x] A backend integration test covers the endpoint's response shape, its
      anonymous access and `Cache-Control: no-store`, and the endpoint is in
      `backend/openapi.json`
- [x] The `make` target changes the row, and a test shows the endpoint
      answering with the new values
- [x] A unit test in the app shows the update-required screen when the
      server's minimum for the app's platform exceeds its build number, and
      not when it equals it or is below it
- [x] A unit test shows maintenance winning when both signals are on, and
      "check again" calling the endpoint again
- [x] On a simulator, raising the minimum version blocks the app on the next
      foregrounding, and lowering it releases it — described in the PR
- [x] A unit test shows an unreachable endpoint lets the app open, and a
      remembered "update required" still blocks it offline, and stops
      blocking when the app's build number meets the remembered minimum
- [x] Both screens read as the table above in both languages, with a
      VoiceOver and TalkBack label on the action

## Notes

Provenance: [backlog](../backlog.md#must-exist-in-the-apps-first-release-or-never).
