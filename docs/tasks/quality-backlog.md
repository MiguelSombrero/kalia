# Quality backlog

Findings from periodic `/quality-sweep` runs land here, grouped only by
severity — **MUST** / **SHOULD** / **COULD** (MoSCoW), never by sweep
date. A sweep is opened as its own PR and reviewed like any other change;
who may start one, and when, is in CLAUDE.md "Quality checks". Each
finding gets a permanent ID within its category (`MUST-1`, `SHOULD-1`, ...)
that is never reused, even after the finding is resolved, lifted or pruned
from this file. **Do not take an ID by looking at the entries below** — most
retired IDs are no longer listed. A new finding takes one past its
category's number on the **Highest issued** line, and the same edit raises
that number. `scripts/check-tasks.mjs` fails an entry numbered above the
line and an ID listed twice among the open findings or twice in
"Retired"; it cannot see a pruned ID reused below the line, so the line is
the only guard against that. Every finding carries a *(confirmed
&lt;date&gt;)* — the most recent sweep that independently reconfirmed it; a
sweep that rediscovers an existing finding updates that date (and the
description, if details changed) in place instead of adding a duplicate
entry. An entry not mentioned by a given sweep simply keeps its prior
confirmed date — that isn't staleness needing action, just "not
independently re-verified this time."

**Findings deferred from a review.** A `/code-review` finding marked *new
task* is filed here in the pull request that defers it, as an entry with its
own ID in the right category, and the PR description names that ID
(`implement-task` step 8; `scripts/check-pr-body.mjs` fails a body that
defers a finding without one). The *(confirmed &lt;date&gt;)* is then the date
it was filed. A bare "follow-up" in a PR body is how six findings from
#452 and the ones from #398, #400 and #425 were lost (SHOULD-90).

A `**[needs decision]**` tag means the finding needs product-owner input
before it's a well-scoped task; anything untagged is ready to implement as
written.

**Lifting a finding into an iteration.** The product owner reviews the
backlog and tells an AI agent which findings to promote — by ID (`MUST-1`,
`SHOULD-3`, ...), a range, or a one-off description for anything not yet
listed here. A `[needs decision]` finding is resolved in that conversation
before it is written up as a task, never silently guessed at. The lifted
task keeps a backreference to its origin (e.g. "(Quality backlog
SHOULD-3)") so the history survives leaving this file — IDs are permanent,
so the ID alone is enough without a date. In the same PR that adds the
task, the finding moves to "Retired" below noting where it went, so a sweep
that runs while the task is open knows the issue is already taken.

**Pruning "Retired".** A retired entry stays only while it can still stop
a sweep listing a known issue twice: until the task it was lifted into is
`done`. Each sweep's PR deletes the entries whose task is `done`, and every
entry that names no task (resolved in place, no longer reproducible,
accepted as a trade-off). A pruned entry loses nothing: the lifted task
keeps the description and its "(Quality backlog SHOULD-n)" backreference,
so searching the repository for the ID finds it, and git keeps the entry
itself (`git log -S 'SHOULD-n' -- docs/tasks/quality-backlog.md`). There
is no archive file, since it would just be the same ever-growing list
somewhere else. An issue that comes back after its task is done is a
regression and gets a new ID, and its description names the ID it
repeats, so the recurrence stays visible once the old entry is gone.

**Highest issued:** MUST-23 · SHOULD-98 · COULD-107

## MUST

*None open — every MUST from the 2026-10-27 sweep was lifted into
[iteration 9](iteration-9.md).*

## SHOULD

- **SHOULD-80** **[needs decision]** *(confirmed 2026-11-04)* — A rejected
  suggestion leaves the pending count (`ContributionService.requireRoomForPending`),
  so a contributor whose 20 suggestions are all rejected can suggest 20 more
  at once, without end; open registration on a phone grows that queue. The
  finding's other half, `make moderate` acting on a contributor's whole
  output, is fixed by
  [iteration 10.5 task 08](iteration-10.5/08-the-sql-moderation-script-is-retired.md).
  Returned here at iteration 10.5's refinement: the product owner chose to
  limit nothing on rejections yet. The decision left open is the shape of a
  limit — rejections counting toward the cap for a period, a cooldown after
  several, or none.

## COULD

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).

## Retired

Findings lifted into a task that is not yet `done`, each noting where it
went; pruned as described above.

- ~~SHOULD-72~~ (another contributor's pending beer blocking an identical one) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-73~~ (the pending-cap 429 shown as a generic failure) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~SHOULD-75~~ (holders adding bottles to a rejected or removed beer) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-76~~ (rejection publishing what review withheld) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-84~~ (the README's architecture diagram restating §2) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-87~~ (the feature list kept four times) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-92~~ (a withheld beer's details link 404ing) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md).
- ~~SHOULD-93~~ (the add-beer flow calling a pending beer public) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~COULD-61~~ (`AddBeerDialog` holding five concerns) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~COULD-78~~ (the feed actions' stale cursor-key comment) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-80~~ (the client accepting `\p{Cf}` the server refuses) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~COULD-84~~ (§3 understating what `fi.kalia.web` holds) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-85~~ (§5 omitting the cellar's `public-cellar` tag exception) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-87~~ (ADR-0007 citing dropped store modules) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-88~~ (smaller doc staleness) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-89~~ (the edge rate and pending cap restated outside their homes) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md).
- ~~SHOULD-80~~ (the SQL moderation script acting on a contributor's whole output, and rejections leaving the pending count) — the script half lifted into [iteration-10.5 task 08](iteration-10.5/08-the-sql-moderation-script-is-retired.md); the rejection half reopened under SHOULD above at that iteration's refinement, 2026-11-04.
- ~~SHOULD-97~~ (a slow Keycloak delaying every app call by its own refresh timeout) — lifted into [iteration-10.5 task 19](iteration-10.5/19-a-slow-keycloak-delays-one-call-not-every-call.md).
- ~~COULD-75~~ (the backend's per-address zone stepped around through the web) — lifted into [iteration-10.5 task 16](iteration-10.5/16-the-backend-limit-holds-for-calls-the-web-makes.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-77~~ (an empty first feed page polling with a backward cursor) — lifted into [iteration-10.5 task 17](iteration-10.5/17-an-empty-feed-polls-only-for-new-lines.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-79~~ (domain timestamps still bypassing the injected `Clock`) — lifted into [iteration-10.5 task 13](iteration-10.5/13-domain-time-from-the-clock-and-one-read-per-duplicate.md).
- ~~COULD-81~~ (`ProfileApi` naming a user only through cellar visibility) — lifted into [iteration-10.5 task 05](iteration-10.5/05-an-admin-reads-the-review-queue.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-83~~ (never-delete decisions stacking up ahead of account deletion) — lifted into [iteration-10.5 task 15](iteration-10.5/15-decision-what-deleting-an-account-does-to-what-kalia-keeps.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-95~~ (a lost concurrent cellar write shown as the generic failure) — lifted into [iteration-10.5 task 18](iteration-10.5/18-a-cellar-write-reads-back-as-it-was-made.md).
- ~~COULD-97~~ (`415`/`406` listed on no operation) — lifted into [iteration-10.5 task 14](iteration-10.5/14-the-committed-spec-lists-every-response-and-its-checks-hold.md).
- ~~COULD-98~~ (the duplicate-brewery path reading the brewery twice) — lifted into [iteration-10.5 task 13](iteration-10.5/13-domain-time-from-the-clock-and-one-read-per-duplicate.md).
- ~~COULD-99~~ (`make moderate` with no way to look before it acts) — lifted into [iteration-10.5 task 08](iteration-10.5/08-the-sql-moderation-script-is-retired.md). The script is removed there rather than given a dry run.
- ~~COULD-100~~ (three gaps around the committed spec) — lifted into [iteration-10.5 task 14](iteration-10.5/14-the-committed-spec-lists-every-response-and-its-checks-hold.md).
- ~~COULD-107~~ (bottles added together reading back in another order) — lifted into [iteration-10.5 task 18](iteration-10.5/18-a-cellar-write-reads-back-as-it-was-made.md).
