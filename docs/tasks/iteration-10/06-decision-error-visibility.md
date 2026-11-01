# Task 06: Decide where the app's errors are visible without a paid service

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** DW-5

## Why

On a simulator, an error in the app shows in Metro's terminal and the dev
menu's red screen. A release build on a phone has neither: an uncaught
exception closes the app, a failed request shows a generic message, and
nothing is left for anyone to read afterwards. The backend and the web both
log JSON and count failures without a viewer
([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md));
the app has nothing comparable, and iteration 12's offline writes and
iteration 14's camera add failures that happen only on a device.

The [backlog](../backlog.md#mobile-client) schedules crash reporting here,
within the no-cost rule — which may mean there is no service that fits.

## Scope

An ADR records where an error in an installed build is visible — the device's
own logs read by a developer, something the app keeps itself, the backend's
logs, or a crash service — and what an error report may contain. If nothing
fits, the ADR records the decision as deferred and what would reopen it.

## Non-goals

- Analytics or usage tracking: not a goal of Kalia.
- Implementing anything beyond the ADR, unless refinement decides the answer
  is small enough to belong here.

## Constraints

- **No cost, no card on file** (`CLAUDE.md`): a crash service is acceptable
  only on a free tier that asks for no card, and is parked otherwise.
- [ADR-0013](../../adr/0013-logging-conventions.md) and ADR-0088: what may be
  logged — no query string, no token, no personal data beyond what they allow;
  [iteration 9 task 20](../iteration-9/20-no-token-or-query-string-in-a-log.md)
  is the precedent for checking it.
- A request the app makes carries the trace id the backend logs
  (ADR-0088), which may already answer "which request failed".
- A third-party SDK is a new dependency — asked, not researched — and one
  that sends data off the device also needs the product owner's view on
  privacy before a store release (the backlog's privacy labels).

**Decided at refinement, 2026-11-01** (product owner):

- **Errors are read from the device's own logs, and a crash service is
  deferred.** A developer reads an installed build's errors in Console.app or
  Xcode for the iPhone and `adb logcat` for Android. The ADR records the
  deferral's trigger — someone other than the product owner installing Kalia,
  which needs the paid distribution the [backlog](../backlog.md#mobile-client)
  parks — and the rejected alternatives: a free crash service (a third-party
  SDK and account sending stack traces off the device, for an audience of one)
  and a backend endpoint for client errors (a new anonymous edge, permanent
  under ADR-0093's additive-only rule).
- **What the app logs follows ADR-0013 and ADR-0088:** no token, no query
  string and no user identity. A failed request's error names its trace id, so
  the backend's line for it can be found.
- **The backend learns nothing new** about client errors.
- **An uncaught error shows a restart screen** — built by
  [task 21](21-an-error-on-a-phone-leaves-something-to-read.md), filed at this
  refinement, which also carries the trace id; this task stays a decision.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records the decision — or the deferral and its trigger — with the
      rejected alternatives and their costs, and passes
      `node scripts/check-adrs.mjs`
- [ ] `mobile/README.md` says where a developer reads an installed build's
      errors on each platform
- [ ] Each test the decision implies — at least that what the app logs or
      shows for an error never contains a token — is named in
      [task 21](21-an-error-on-a-phone-leaves-something-to-read.md)'s
      acceptance criteria, and the ADR links that task

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks;
[backlog](../backlog.md#mobile-client), "Crash reporting". A decision task, so
it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
