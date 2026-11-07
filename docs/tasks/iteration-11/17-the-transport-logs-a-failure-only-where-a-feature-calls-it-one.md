# Task 17: The app's transport logs a failure only where a feature calls it one

- **Status:** done
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

The app's transport (`mobile/src/lib/api/registerTransport.ts`) writes an error
line for every response of status 400 or above. Nothing the app calls today
treats a 4xx as an expected answer, but the screens of this iteration do: a beer
that is withheld answers `404`, and [task 10](10-beer-details.md) reads that as
"no such beer"; a later `409` is a lost race. Each would write one error line per
visit, which [ADR-0013](../../adr/0013-logging-conventions.md) says an
anticipated status should not.

The same log line carries the request's path unredacted. No call the app makes
today has a user's name in its path, but a public profile or public cellar read
would (`/api/v1/profiles/{username}`), and the mobile README reads ADR-0013 as a
no-user-identity rule. The premise that this is mobile-only and future does not
hold: every public-cellar visit on the web already writes the username with the
client's address in three logs — the backend's `RequestLogFilter` (raw path), the
web's `mutator.ts` and the edge's access log — including misspelled names and
private cellars that answer 404. ADR-0013 itself says "secrets/PII".

## Scope

A status is logged as a failure only where the feature that reads it calls it
one. Every tier logs a route template rather than a raw path, and the logging
conventions say why.

## Non-goals

- Crash reporting
  ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).
- A log viewer or a metrics change
  ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).

## Constraints

- ADR-0013 is the convention; a change to what it says is an amendment.
- No signed token or query string reaches a log
  ([iteration 9 task 20](../iteration-9/20-no-token-or-query-string-in-a-log.md)).
- An installed build's errors are read from the device's own logs, so a line
  the app stops writing is one nobody can read later.

**Decided at refinement, 2026-11-07** (product owner):

- **A call declares the statuses it reads as answers** — the beer read's
  `404`; the transport keeps logging every other 4xx and 5xx, so an
  unanticipated failure cannot go silent.
- **Every tier logs the route template, never the raw path:** the backend's
  best-matching pattern, the operation's path template in the web's and the
  app's transports, and a path map in nginx's access log. ADR-0013 is amended
  to say why — a username beside a client's address is personal data — and the
  mobile README's reading of it stands.
- **A `401` the refresh resolves writes no line;** one still returned after the
  retry is logged. **A `429` is logged as a failure,** since the app should
  never reach the limit.

## Open questions

**None.**

## Acceptance criteria

- [x] A test shows a `404` read as "no such beer" writing no error line, and a
      `500` still writing one; the first failed before the change
- [x] A test shows a status the calling feature expects, given as the call
      says, writing no error line
- [x] A test in each tier — the backend, the web's transport, the app's
      transport and the edge's configuration — shows
      `/api/v1/profiles/{username}` logged as its template, and ADR-0013 says
      why
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-115 and COULD-116
(`[needs decision]`). Runs before [task 10](10-beer-details.md), the first
screen to read a `404` as an answer.
