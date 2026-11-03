# Task 08: The SQL moderation script is retired, and a rejection counts against its contributor

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

SHOULD-80 records a second gap the script leaves: a rejected row leaves the
pending count (`ContributionService.requireRoomForPending`), so a contributor
whose 20 suggestions are all rejected can suggest 20 more at once, without end.
Open registration on a phone grows that queue.

## Scope

`make moderate` and `scripts/moderate-contributor.sql` are gone, along with
every mention of them in the docs, and whatever they could do that the admin
API cannot — removing an approved beer, if
[task 02](02-decision-what-reviewing-a-suggestion-does.md) keeps it — is in the
admin API. Rejections count toward a limit on what a contributor may suggest,
as refinement decides.

## Non-goals

- Bulk actions on a contributor's whole output, unless refinement keeps one.
- A dry-run mode for the script (COULD-99): the script is removed rather than
  improved, and the admin page shows what it acts on before it acts.

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
  is never read by both; a cooldown counted in the same place inherits that.

## Open questions

1. **The cooldown (SHOULD-80, `[needs decision]`):** rejections count toward
   the 20 for a period; a contributor with N rejections in a window is refused
   further suggestions for a while; or rejections are only shown to the admin
   (task 05) and nothing is enforced.
2. **What the refusal says,** in both locales, and whether it tells the
   contributor how long to wait.
3. **Any operator path that stays:** none, or a documented SQL recipe for an
   emergency removal when the admin page is down.

## Acceptance criteria

- [ ] `make moderate`, its script and every reference to them are gone — a
      search of the repository finds none outside retired history, and
      `make check` passes
- [ ] An integration test shows a contributor's rejections limiting further
      suggestions as refinement decides, and was confirmed to fail before the
      change
- [ ] If task 02 keeps removal, an integration test removes an approved beer
      through the admin API with the effects ADR-0091 states
- [ ] ADR-0091, `backend/README.md` and `docs/architecture.md` describe the
      admin path instead of the script
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-80
(`[needs decision]`, open question 1) and COULD-99, both returned from
iteration 10 by the product owner on 2026-11-01 to be fixed with the admin
page.
