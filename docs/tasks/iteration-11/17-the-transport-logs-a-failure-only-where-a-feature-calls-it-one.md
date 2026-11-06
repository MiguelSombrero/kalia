# Task 17: The app's transport logs a failure only where a feature calls it one

- **Status:** needs-refinement
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
one. The path question is settled for every tier or for none, and the
logging conventions say which.

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

## Open questions

- **Functional scope.** Move the line from the transport to `httpFailure`'s
  callers, or let a call say which statuses it expects.
- **Terminology and constraints.** The path question is SHOULD-116's
  `[needs decision]`: either a public username is not identity — close the
  finding and amend the mobile README — or every tier logs route templates
  (the backend's best-matching pattern, the operation's path template in both
  transports, a path map in nginx). The second changes four places.
- **Edge cases.** A `401`, which the refresh path handles, and a `429`.

## Acceptance criteria

- [ ] A test shows a `404` read as "no such beer" writing no error line, and a
      `500` still writing one; the first failed before the change
- [ ] A test shows a status the calling feature expects, given as the call
      says, writing no error line
- [ ] The path decision is applied as it falls: either the mobile README and
      ADR-0013 say a public username is not identity, or a test shows each tier
      logging the route template for `/api/v1/profiles/{username}`
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-115 and COULD-116
(`[needs decision]`). Runs before [task 10](10-beer-details.md), the first
screen to read a `404` as an answer.
