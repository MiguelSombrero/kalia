# ADR-0093: The API is additive-only while an app is installed, and a committed spec fails a breaking diff

- **Status:** accepted
- **Date:** 2026-10-30
- **Amended:** 2026-11-04 — a new `oneOf` member in a 4xx or 5xx response body
  is additive, and the breaking-diff job lets exactly that finding through
  (iteration 10 task 16); see the "Additive" bullet of Decision
- **Amended:** 2026-11-07 — the policy and the breaking-diff failure apply from
  the app's first distribution beyond the product owner's own phone, and the
  check is advisory until then (maintenance change, no iteration task); see
  "Amendment 2026-11-07" below the Decision's verdict

## Context

Until now the backend and its only client deploy together, so any change to
`/api/v1` can be made and consumed in one pull request. A mobile app ends
that: it keeps calling the API it was built against for as long as it stays
installed, and some installs never update. [Iteration 8.5 task 02](../tasks/iteration-8.5/02-api-contract-pruned-before-it-freezes.md)
pruned the contract for this moment, and [iteration 9 task 21](../tasks/iteration-9/21-public-cellar-response-settled-before-the-freeze.md)
settled the last response shape that was still moving. Neither says what
happens to the contract next: which changes remain allowed, what forces a
`/api/v2`, how long a retired element lives and what catches a mistake
before it merges rather than in review.

The same moment reopens [ADR-0012](0012-orval-api-client.md), which rejected a
committed OpenAPI spec because a checked-in copy of another system's contract
goes stale silently. That held for one client regenerated against a running
backend. With two, the drift check would need a Docker stack per client in
CI, and a macOS runner building the iOS app may not have Docker at all.

A server-side lever also exists, built in [task 12](../tasks/iteration-9/12-app-config-endpoint.md):
`GET /api/v1/app-config` returns the minimum supported app build per platform
and a maintenance flag. The policy has to say how the two work together,
because the minimum is the only thing that can ever make a retired element
safe to remove.

## Decision

**`/api/v1` changes additively only; a breaking change is made as a new path
beside a deprecated old one, retired once the minimum supported app build
excludes every build that uses it, and the OpenAPI spec is committed so a
test and a CI job fail a drift or a breaking diff before merge.**

**Amendment 2026-11-07: the breaking-diff failure waits for distribution.** The
only installed app is the product owner's own iPhone, which free provisioning
re-signs from source every seven days, so there is no installed build the
policy could protect and the additive-only discipline costs more than it
saves. The rules below stay the design; from now on they bind work from **the
first distribution of the app beyond the product owner's own phone** — a
build installed on any device that is not theirs, whether through TestFlight,
a Play track, an APK handed to a tester or a store release. Until then
`scripts/check-api-breaking.mjs` still runs, in `make verify-fast`, `make
verify` and the `api-breaking-change` job, and prints every finding it would
have failed on, including the removal of a deprecated element no waiver
covers, labelled advisory; it exits 0. A failure to run it (no `oasdiff`, an
unreadable spec, a malformed waiver file) still fails. What flips the check is
one constant, `ENFORCED` in that script, set to `true` as part of the
distribution work ([backlog](../tasks/backlog.md)). `CommittedOpenApiSpecIT`
and `make api-drift` check the spec against the served API and the generated
client, not compatibility, and are unchanged, as is the `app-config`
endpoint.

- **Both clients make one promise: ignore unknown fields, and treat an
  unknown enum value as a fallback.** The web and the mobile app each
  hold it. It is what makes the rest of this list safe.
- **Additive** (allowed at any time): a new endpoint, a new optional response
  field, a new optional request parameter, a new enum value, a new member of
  the `oneOf` in a 4xx or 5xx response body (a client already treats an error
  body it does not recognise as a generic failure, and the new member is that
  kind of body; the same addition to a 2xx body stays breaking, since a client
  parses a success).
  **Breaking:** removing, renaming or retyping anything, making an optional
  field required, and tightening a request's validation.
- **A deprecated element lives until the minimum supported app build
  ([task 12](../tasks/iteration-9/12-app-config-endpoint.md)) excludes every
  app build that uses it.** The window is measured in releases, not in time.
  A time floor is added once the app is distributed beyond the product owner's
  own phone.
- **`/api/v2` covers the whole API, never one resource, and only for a
  breaking change that cannot be made as a new path beside the old one.** The
  normal route is the new path, with the old one deprecated.
- **A deprecation is announced by the OpenAPI `deprecated` flag and nothing
  else.** The generated client turns it into `@deprecated`, which lint
  flags at every use. `Deprecation` and `Sunset` response headers wait for
  distribution beyond the product owner's phone, since a window measured in
  releases has no date to put in them.
- **The OpenAPI spec is committed, and a breaking change fails CI.** A backend
  test fails when the committed spec differs from the one the application
  serves. Both clients generate from the committed file, so neither needs a
  Docker stack or a running backend. A CI job diffs the spec against `dev`'s
  and fails on a breaking change. All three are built by
  [task 09](../tasks/iteration-9/09-shared-packages.md); which OpenAPI-diff
  tool the job uses is a dependency question for that task, not decided here.
- **The app-config endpoint and this policy are two halves of one retirement.**
  The deprecation flag says an element is on its way out; the minimum build
  says when no installed app can still depend on it. Raising the minimum past
  the last build that uses a deprecated element is what permits removing it,
  and it is the only thing that does. Maintenance is separate: it is a
  temporary refusal to serve, not a change to the contract, and nothing in
  this policy depends on it. The app-config endpoint is itself bound by the
  policy — an installed app cannot learn a field added to it later, which is
  why its two signals exist in the first release.

This ADR covers `/api/v1` as served to the web and the mobile app. The
rules land in [architecture.md §4](../architecture.md#4-api-design); this
record holds the reasoning.

## Alternatives considered

**Versioning per resource** (`/api/v1/beers` beside `/api/v2/cellar`).
Rejected by the product owner: every client would have to track a version per
resource, the spec and its documentation would carry several coexisting
versions, and the cost would be paid at every breaking change rather than
only at the rare one that cannot be made as a new path.

**A time floor for how long a deprecated element lives.**
Rejected for now: no build is distributed beyond the product owner's own
phone, so there is nobody for a date to protect, and a clock would retire an
element on a schedule unrelated to which builds still call it. It is added
when the app reaches other users; the minimum build then becomes the second
condition, not the only one.

**`Deprecation` and `Sunset` response headers** beside the OpenAPI flag.
Rejected for now because the window is measured in releases, so there is no
date to put in `Sunset`, and a header an installed app does not read tells no
one anything. Revisited with the time floor.

**Keeping ADR-0012's live spec**, regenerating each client against a running
backend and diffing the result. Rejected: it would cost one Docker stack per
client in CI, a macOS runner may have no Docker at all, and a breaking change
would still be visible only as a changed generated file in review rather than
as a failed check on the spec.

**No mechanical check, with review as the safeguard.** Rejected: a removed or
retyped field is a small hunk in a large diff, and a reviewer who sees a
changed DTO sees nothing wrong with it. The failure appears on a phone the
author cannot reach. The checks cost one test and one CI job.

## Consequences

- Good, because a mistake that would break an installed app fails a check
  before it merges, and the author learns it in their own pull request rather
  than from a user.
- Good, because neither client needs a running backend or a Docker stack to
  generate its types, which is what lets the iOS build run on a runner
  without Docker.
- Good, because the one lever that can retire an element is a number the
  server already has to expose ([task 12](../tasks/iteration-9/12-app-config-endpoint.md)),
  so removal is decided by data, not by a calendar.
- Bad, because a legitimate removal is a breaking change too, and the diff
  job as decided has no way to tell one from a mistake. Task 09 has to say how
  the removal of an element that `dev`'s spec already marks deprecated is let
  through, and what the pull request must state — the build number that
  excludes the last user of the element — before it does.
- Bad, because "excludes every build that uses it" needs a record of which
  release stopped calling each deprecated element, and nothing keeps that
  record yet. Until it exists the check is a person reading release history.
- Bad, because the spec is a second place a contract can go stale — the very
  cost ADR-0012 rejected. The backend test that compares it with the served
  spec is what stops it, and the policy depends on that test existing.
- Bad, because the generated client's `@deprecated` annotation reaches a
  developer only through a lint rule that flags its use, and no such rule is
  configured today. Enabling it, and any dependency that needs, is task 09's
  to ask.
- Bad, because letting an added error-body `oneOf` member through trusts that
  no client branches on an error body's shape without a fallback; the web's
  `addBeer` reads a `409` with neither id as the new member, and a client that
  guessed otherwise would mislabel it. Nothing checks that either client keeps
  a fallback.
- Bad, because the allowance is one finding id on one status range in
  `scripts/check-api-breaking.mjs`, a second rule beside oasdiff's own, which
  has to be kept when oasdiff renames the check.
- Bad, because the additive list holds only if both clients keep their
  promise, and only part of it is checked. A client that parses strictly or
  switches exhaustively on an enum breaks on a change the spec diff correctly
  calls additive. Both clients were audited for enums they map to a label, a
  colour or a form, and each now looks one up through `enumLookup()` in
  `@kalia/api`, which answers a fallback (the generic word "Other" or "Muu";
  a form keeps the value it was given and saves it unchanged). A lint rule
  (`kalia/no-closed-enum-map`) fails a `Record` or mapped type keyed by an
  API type, but it is syntactic: a template-literal key
  (`` t(`x.${value}`) ``), a `switch` and a plain object lookup are not
  caught, and the admin pages are not audited.
- Neutral, because `app-config` fails open when unreachable, so the minimum
  protects only an app that can reach the server: an install that was offline
  when the minimum was raised keeps its old build, and the first calls it
  makes on reconnecting can reach a removed element before the check answers.
- Bad, because while the check is advisory a breaking change can merge
  unnoticed, and an element the first distributed build calls may already be
  gone by then; the spec's history is the only record of what an earlier build
  could call.
- Bad, because re-arming is by hand: the policy returns only when someone
  flips `ENFORCED`, and the one line in the backlog that says so is the whole
  mechanism. A distribution that skips it ships with the check silent.
- Neutral, because the advisory output keeps the diff, the waiver validation
  and the stale-branch advice running, so the machinery is exercised on every
  push and flipping the constant changes only the exit code.
- **Revisit trigger:** the app is distributed beyond the product owner's own
  phone — set `ENFORCED` in `scripts/check-api-breaking.mjs`, add the time
  floor, and reconsider the `Deprecation` and `Sunset` headers with them.
