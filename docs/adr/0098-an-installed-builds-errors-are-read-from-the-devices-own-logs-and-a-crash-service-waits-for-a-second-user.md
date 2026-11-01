# ADR-0098: An installed build's errors are read from the device's own logs, and a crash service waits for a second user

- **Status:** accepted
- **Date:** 2026-11-01

## Context

On a simulator an error in the app shows in Metro's terminal and the dev menu's
red screen. A release build on a phone has neither: an uncaught exception
closes the app, a failed request shows a generic message, and nothing is left
for anyone to read afterwards. The backend and the web both log JSON and count
failures without a viewer
([ADR-0088](0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md));
the app has nothing comparable, and iteration 12's offline writes and
iteration 14's camera add failures that happen only on a device. The
[backlog](../tasks/backlog.md#mobile-client) scheduled "crash reporting" for
iteration 10 *within the no-cost constraint*, which may mean no service fits.

Three forces decide it. The project adds no cost and puts no payment card on
file (`CLAUDE.md`). Iteration 10 installs the app on the product owner's own
iPhone only, through a free Apple ID: nobody else can install it until the
paid distribution the backlog parks exists. And a log may hold no token, no
query string and no personal data beyond what
[ADR-0013](0013-logging-conventions.md) and ADR-0088 allow, which any error
report is a log for.

Product-owner decisions at refinement on 2026-11-01, recorded here as made
([task 06](../tasks/iteration-10/06-decision-error-visibility.md)).

## Decision

**An installed build's errors are read from the device's own logs by a
developer, and a crash service is deferred until someone other than the
product owner installs Kalia.**

- **Where a developer reads them:** Console.app or Xcode for the iPhone, and
  `adb logcat` for Android.
  [`mobile/README.md`](../../mobile/README.md#reading-an-installed-builds-errors)
  holds the steps.
- **What the app writes there follows ADR-0013 and ADR-0088:** no token, no
  query string and no user identity. A failed request's error names its trace
  id, so the backend's line for the same request can be found.
- **The backend learns nothing new** about client errors: no endpoint receives
  them, and nothing about them is counted server-side.
- **An uncaught JavaScript error shows a restart screen** instead of closing
  the app. That, and the trace id on the app's requests, is
  [task 21](../tasks/iteration-10/21-an-error-on-a-phone-leaves-something-to-read.md),
  which this decision binds; the tests it implies are named in that task's
  acceptance criteria, starting with *no token reaches a logged line or the
  screen*.
- **The deferral's trigger is a second person installing Kalia.** That needs
  the Apple Developer Program, which the backlog parks until the product owner
  decides to spend. Until then the only person who can have a crash is the one
  holding the phone and the Mac, and can read the log.
- **Not covered:** a native crash still closes the app and leaves only what
  the operating system itself writes to the device log. No part of this
  decision sends anything off the device.

## Alternatives considered

- **A free-tier crash service** (a third-party SDK and an account). Rejected: it
  is a new dependency that sends stack traces and device details off the
  device, to answer a question whose audience is one person who can already
  read the device's log. It also needs the product owner's privacy view before
  any store release (the backlog's privacy labels).
- **A backend endpoint that receives client errors.** Rejected: it is a new
  anonymous edge — a crashed app may have no valid token to send, so it cannot
  be authenticated — that must be rate-limited and bounded
  ([ADR-0090](0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)),
  and under [ADR-0093](0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)'s
  additive-only rule it can never be removed or reshaped while any build that
  calls it is installed.
- **The app keeps its own error log** (a file or store on the device, shown in a
  screen or shared out). Rejected: it is storage and a screen built for a reader
  who can already plug the phone in, and a stored log is one more place a token
  or an identity could be written to rest.
- **The backend's logs alone.** Rejected as the whole answer: a failed request
  reaches the backend, but a JavaScript exception, a render error or a request
  that never left the phone does not. They stay the other half of a failed
  request, found through its trace id.

## Consequences

- Good, because nothing is added to the stack, the repository's dependencies
  or the app's privacy surface: no account, no SDK, no endpoint, no card.
- Good, because the error a developer reads can be matched with the backend's
  line for the same request through the trace id ADR-0088 already carries.
- Bad, because nobody finds out about an error they were not holding the phone
  for: an error on a phone that is not plugged into a Mac, and was not noticed
  at the time, is gone. Task 21's restart screen makes it visible to the person
  using the app, not to the developer afterwards.
- Bad, because a native crash is not covered at all, and the restart screen is
  built by hand rather than by a library.
- Neutral, because `mobile/`'s lint forbids `console.*`
  ([ADR-0013](0013-logging-conventions.md)), so writing to the device log needs
  one sanctioned path, which task 21 builds.
- **Revisit trigger:** someone other than the product owner installs Kalia — a
  TestFlight tester or a Play Store user — or the product owner decides to
  spend on the Apple Developer Program. Reopen then with the questions
  deferred here: which service, what an error report may carry, and the
  privacy labels.
