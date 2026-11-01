# Task 21: An error on a phone leaves something to read

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

[Task 06](06-decision-error-visibility.md) decides that an installed build's
errors are read from the device's own logs, with no crash service. Two things
that decision relies on do not exist yet. An uncaught JavaScript error in a
release build — which has no red screen — closes the app, or leaves it on a
blank screen, with nothing said in either locale. And a failed request cannot
be matched with the backend's log line for it: the web's `proxy.ts` starts a
W3C `traceparent` for every request
([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)),
but the app sends none.

## Scope

An uncaught JavaScript error shows a screen that says something went wrong and
offers a restart, in both locales, with the app's build number. Every API call
the app makes carries a trace id the backend logs, and a failed request's
error names it, in the device's log and on screen.

## Non-goals

- Native crashes, which still close the app: no crash service
  ([task 06](06-decision-error-visibility.md)'s deferral).
- The screen's visual design beyond today's components —
  [iteration 11](../iteration-11.md).

## Constraints

- Filed at iteration 10's refinement, 2026-11-01, as the implementation of
  task 06's decision; follows its
  [ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md),
  and runs after
  [task 05](05-build-variants.md), whose release build is where the red screen
  is gone and whose build number the screen shows.
- What the app logs or shows: no token, no query string and no user identity
  ([ADR-0013](../../adr/0013-logging-conventions.md), ADR-0088);
  [iteration 9 task 20](../iteration-9/20-no-token-or-query-string-in-a-log.md)
  is the precedent for checking it.
- The `traceparent` is set in the shared API client's transport, which the web
  also uses
  ([ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)):
  the web's own `traceparent` must keep winning there.
- Finnish is a full peer of English
  ([ADR-0011](../../adr/0011-i18next-localization.md)); strings in the shared
  locale package.
- Expo and expo-router postdate model training — check docs.expo.dev at the
  SDK version in `mobile/package.json` for error boundaries, never memory.

## Open questions

**None.**

## Acceptance criteria

- [ ] A Jest test throws inside a screen and sees the restart screen in both
      locales, with the build number, and restarting renders the app again
- [ ] A Jest test shows every API call the app makes carrying a valid
      `traceparent`, and the web's unit tests of the shared transport still
      pass
- [ ] A Jest test shows a failed request's error naming its trace id, and
      that neither the logged line nor the screen contains the access token,
      a query string or the signed-in user's name
- [ ] On a release build, a forced error shows the restart screen — verified
      by hand on a simulator or the iPhone and described in the PR
- [ ] On the same build, the forced error's logged line is found in Console.app
      or `adb logcat` as `mobile/README.md` says to read it, and the PR says
      what was seen — the README's filters are corrected if they showed nothing
- [ ] `make verify-fast` is green

## Notes

Provenance: [task 06](06-decision-error-visibility.md)'s refinement.
