# Task 08: The SQL moderation script is retired, and an admin can remove an approved beer

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2

## Why

`make moderate` runs `scripts/moderate-contributor.sql` through
`docker compose exec`. It acts on every row a contributor added at once —
removing one bad beer also removes their approved ones — writes `catalog`
tables around the domain, reads `profile.profile` across schemas, publishes no
event, and has no way to look before it commits (SHOULD-80, COULD-99). Once
tasks [06](06-an-admin-approves-or-rejects-a-suggestion.md) and
[07](07-an-admin-edits-a-suggestion-before-approving-it.md) give review an
application path, keeping the script leaves a second way to change a status
that bypasses every event the first one publishes.

The script is also the only way to take down a beer that was approved and
should not have been, so retiring it means the admin API can do that too.

## Scope

`make moderate` and `scripts/moderate-contributor.sql` are gone, along with
every mention of them in the docs, and whatever they could do that the admin
API cannot — removing an approved beer, if
[task 02](02-decision-what-reviewing-a-suggestion-does.md) keeps it — is in the
admin API. The pending cap counts suggestions rather than entries, as
[task 02](02-decision-what-reviewing-a-suggestion-does.md) decided.

## Non-goals

- Bulk actions on a contributor's whole output, unless refinement keeps one.
- A dry-run mode for the script (COULD-99): the script is removed rather than
  improved, and the admin page shows what it acts on before it acts.
- Rejections limiting what a contributor may suggest next — SHOULD-80's second
  half, returned to [the quality backlog](../quality-backlog.md) at
  refinement.
- The removal action on a beer's page —
  [task 20](20-an-admin-removes-an-approved-beer-from-its-page.md).

## Constraints

- **This task cannot be refined before [task 02](02-decision-what-reviewing-a-suggestion-does.md)
  is done.**
- ADR-0091 states the operator command as its decision; it is amended, not
  contradicted ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- The pending cap's `429` is a documented response of `POST /api/v1/beers`; a
  cooldown that refuses differently is a contract change to document
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  and the add dialog's cap message
  ([iteration 10 task 16](../iteration-10/16-adding-a-beer-says-what-happens-to-it.md))
  must still say what happened.
- Two adds by one contributor are serialised by an advisory lock, so a count
  is never read by both.
- Removal staying as an admin operation, its event, and the cap counting
  suggestions are [task 02](02-decision-what-reviewing-a-suggestion-does.md)'s
  decisions.

**Decided at refinement, 2026-11-04** (product owner):

- **Rejections limit nothing** (SHOULD-80): neither a cooldown nor a count.
- **The cap's refusal stays the documented `429`,** and the add dialog's
  message says that pending suggestions count, with no date for when room
  frees; the wording is drafted in the PR.
- *Derived:* **no operator path stays** — removal is in the admin API.

## Open questions

Every question was answered at refinement on 2026-11-04 — task 02's in its
Constraints, this task's above. The task moves to `refined` once task 02's ADR is accepted
and this file is checked against it.

## Acceptance criteria

- [ ] `make moderate`, its script and every reference to them are gone — a
      search of the repository finds none outside retired history, and
      `make check` passes
- [ ] An integration test shows a beer with a new brewery counting once against
      the cap of 20, and was confirmed to fail before the change
- [ ] The add dialog's cap message speaks of pending suggestions, in both
      locales — component test
- [ ] An integration test removes an approved beer through the admin API with
      the effects ADR-0091 states, publishing the event task 02 named, and a
      non-admin's removal is refused
- [ ] ADR-0091, `backend/README.md` and `docs/architecture.md` describe the
      admin path instead of the script
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-80 and COULD-99,
both returned from iteration 10 by the product owner on 2026-11-01 to be fixed
with the admin page. SHOULD-80's script half is fixed here; its rejection half
went back to the quality backlog at refinement on 2026-11-04.
