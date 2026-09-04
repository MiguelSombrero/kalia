# Task 12: Judge a bottle's brewed date against the user's local day

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

"Brewed in the future" is judged against the UTC date on both sides, while the
date picker offers the user's **local** date. A user east of UTC, in the first
hours of their local day, picks today — which is already tomorrow in UTC — and
is told the bottle is brewed in the future. They cannot record a bottle brewed
today until UTC catches up.

- Frontend: `todayIso()` is
  `new Date().toISOString().slice(0, 10)`
  ([bottleDateRules.ts:3](../../../frontend/features/cellar/bottleDateRules.ts)),
  the UTC calendar date, compared with `>` against `brewedDate`.
- Backend mirror: `requireValidDates` uses `LocalDate.now()`
  ([Bottle.java:82](../../../backend/src/main/java/fi/kalia/cellar/domain/Bottle.java))
  in the container's default zone, which is UTC.

Both schema tests use `2999-01-01`, which is in the future under every
timezone, so nothing in either suite pins the actual boundary and the bug
passes CI.

## Scope

The "not brewed in the future" rule — the frontend Zod refinement and the
backend domain guard — is evaluated against the user's local calendar day, so
the date shown in the picker is the date that is judged. Today remains a valid
brewed date (the boundary is inclusive).

## Non-goals

- Storing a time or a timezone on a bottle: `brewedDate` stays a `LocalDate`.
- The `bestBeforeDate` must be after `brewedDate` rule — it compares two
  user-supplied dates and is timezone-independent.
- Any other date in the app.

## Constraints

- **Decided with the product owner (2026-09-04, quality backlog MUST-9):
  "today" is the client's local day.** The frontend supplies its local notion
  of today and the backend validates against that rather than its own
  `LocalDate.now()`.
- A client-supplied "today" is **not** a security boundary. The backend trusts
  only the token ([ADR-0028](../../adr/0028-resource-server-and-current-user.md));
  the worst a caller can do by lying is backdate or postdate their own bottle
  by about a day, which the rule bounds only loosely anyway. State this in the
  PR so review does not relitigate it as a trust issue.
- The backend keeps its contract: an invalid date throws
  `InvalidBottleException`, surfaced as 400 by `CellarExceptionHandler`.
- `applyBottleDateRules` is shared by the add and edit forms — the frontend
  fix lands once, there.
- Whether this earns an ADR or a line in `docs/architecture.md` follows
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) (rejected
  alternative: "UTC everywhere"). Settle in refinement.

## Open questions

- **Interaction / transport:** does the request carry the client's local date
  as a value, or its UTC offset in minutes, or does the authoritative check
  move client-side with the backend keeping only a loose guard (e.g. "not
  after tomorrow UTC")? Each has a different API-shape and testability cost.
- **Failure handling:** if a request arrives with no client "today" (an older
  client, a script), does the backend reject, or fall back to UTC
  `LocalDate.now()`?
- **Interaction / UX:** should the picker's `max` also be the local day, so
  the future date cannot be selected at all and the validation message is
  only a fallback?
- **Edge cases:** non-whole-hour offsets and DST — sending a date string
  sidesteps these; sending an offset does not fully.
- **Constraints:** ADR, an `architecture.md` line, or neither.

## Acceptance criteria

- [ ] A frontend unit test on `applyBottleDateRules` pins a fixed clock and a
      positive UTC offset and asserts that the user's local "today" is
      accepted during the UTC-previous-day window — confirmed to fail against
      the current `todayIso()`
- [ ] A `cellar` backend test (`*Test`/`*IT`) pins the boundary with a date
      other than `2999-01-01`: the client's local today is accepted, a date
      genuinely a day past it is rejected — confirmed to fail against
      `LocalDate.now()`-in-UTC
- [ ] In a browser (or a Playwright spec) a bottle with `brewedDate` set to
      the local today is accepted while the machine clock is in the UTC
      boundary window
- [ ] `make verify` is green; any ADR or `docs/architecture.md` section
      touched is updated in the same PR

## Notes

Provenance: quality backlog **MUST-9** (confirmed 2026-08-30). The
`[needs decision]` was resolved with the product owner on 2026-09-04 — the
client's local day, not UTC everywhere.
