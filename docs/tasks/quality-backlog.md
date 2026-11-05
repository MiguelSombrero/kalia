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

**Highest issued:** MUST-23 · SHOULD-102 · COULD-117

## MUST

*None open — every MUST from the 2026-10-27 sweep was lifted into
[iteration 9](iteration-9.md).*

## SHOULD

- **SHOULD-102** *(confirmed 2026-11-04)* — Proposing a new brewery whose name
  and country another contributor holds as `PENDING` answers
  `DuplicateBreweryProblem` with that brewery's id, name and country, and the
  add-beer dialog offers "Use it"; choosing it then answers `404`
  (`findVisibleById` hides the row), the dead end SHOULD-72 closed for beers.
  `ContributionService.newBrewery` has the same lookup as `existingBrewery`
  without the visibility check; it wants the same anonymous `409`, or a
  decision that a brewery's name may be disclosed. Found while implementing
  [iteration 10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
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
- **SHOULD-99** *(confirmed 2026-11-04)* —
  `ProfileServiceModuleIT.concurrentFirstSignInsForANewUserBothSucceedAgainstOneSharedProfile`
  still fails at random. It asserts `reads > bothSawNoProfile.getParties()`,
  that the service retried, but a retry happens only when one of the two
  sign-ins loses the insert race, and timing decides whether either does. It
  went red on `dev` in run 41231274792 and passed on its pull request
  ([common-failures](../common-failures.md), the 2026-10-31 row for that run,
  "not fixed here"). Fix it as the 2026-10-30 row for
  `ProfileServiceConcurrencyIT` was fixed: force the interleaving so the
  conflict always happens, rather than asserting that it did.
- **SHOULD-100** *(confirmed 2026-11-04)* — Four rows in
  [common-failures](../common-failures.md) are tests that race themselves,
  not the product: `ObservabilityIT` read a log line written after the
  response (two rows), and two `ProfileService*IT` tests asserted that a race
  happened without causing it (two rows, one still open as SHOULD-99).
  `docs/architecture.md`'s testing strategy has no rule for either shape. Add
  two, so the next such test is written right the first time: a concurrency
  test forces the interleaving it checks (barriers placed so the conflict
  always happens, or a hook that delays one side) and never asserts that a
  race occurred; a side effect that happens after the response, such as a
  log line or a listener's write, is awaited, never read once. Add a way to
  run one integration test many times in a row (for example a `make` target
  taking the test name and a count), and have the rule say that a new or
  changed concurrency test passes it before its pull request opens.
- **SHOULD-101** **[needs decision]** *(confirmed 2026-11-04)* — A
  [common-failures](../common-failures.md) row can record a live defect with
  no owner. The 2026-10-31 row for run 41231274792 says "not fixed here" and
  names nothing that will fix it, and the defect sat unfiled until this entry
  (SHOULD-99). `check-pr-body.mjs` already refuses a PR body that defers a
  finding without a quality-backlog ID; the log has no such rule, so a
  deferral there is lost the way bare "follow-ups" were (SHOULD-90).
  [ADR-0084](../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)
  would be amended to say that a row whose failure is a repository defect left
  unfixed names a quality-backlog ID, a task or a playbook entry. The decision
  left open is the enforcement: that sentence in the log's header and the
  ADR, or a checker in `make check` (which has to tell "not fixed" apart from
  a cause outside the repository, such as a registry outage, which needs no
  owner).

## COULD

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).
- **COULD-109** *(confirmed 2026-11-04)* — A root `scripts/*.mjs` file that
  imports an npm package passes `make verify-fast` locally and fails in CI,
  because the `Static checks` job runs `make check` with no `npm ci` by
  design ([common-failures](../common-failures.md), the 2026-11-03 row,
  `ERR_MODULE_NOT_FOUND … 'sharp'`). Add a checker to `make check`, and so to
  the edit-time hook, that fails a root `scripts/` file importing anything
  other than a `node:` built-in or a relative path, and points at
  `mobile/scripts/` or a package's own scripts instead.
- **COULD-110** *(confirmed 2026-11-04)* — `check-pr-body.mjs` runs only in
  CI, after the push, although it already takes `--body-file` and
  `--diff-file`. Three `Gates section: no verdict on a line starting
  "- **Range:**"` rows in [common-failures](../common-failures.md) each cost a
  CI round trip and a body edit. `implement-task` step 12 would draft the body
  in the scratchpad, run the checker against it and `git diff
  origin/dev...HEAD`, then open the PR with `gh pr create --body-file`.
- **COULD-111** **[needs decision]** *(confirmed 2026-11-04)* — CodeQL has
  failed two pull requests on new `scripts/` code that `verify-fast` passed:
  `js/incomplete-multi-character-sanitization` on a single-pass comment strip
  (PR 434) and `js/clear-text-logging` on a message carrying a `process.env`
  value (PR 500). Nothing local runs those queries. The decision left open:
  an opt-in `make codeql` running the CodeQL CLI's JavaScript default suite
  over `scripts/` (a new tool, so a version question under CLAUDE.md's "New
  dependencies"), or a `docs/ci-playbook.md` entry naming the two queries and
  the patterns that satisfy them (strip until stable; never log a value
  derived from `process.env`).
- **COULD-112** *(confirmed 2026-11-04)* — `docker compose up --wait` fails
  when it names a one-shot service, or names none so that every one-shot is
  included. Locally Compose races and exits `1` on a container that exited
  `0` ([ci-playbook](../ci-playbook.md#not-ci-but-the-same-recognition-problem));
  on the runner it failed every time (`container kalia-keycloak-seed-1
  exited (0)`, the 2026-10-31 `mobile-e2e` row in
  [common-failures](../common-failures.md)). `check-compose.mjs` could fail a
  `--wait` in the `Makefile`, a workflow or a script that does not name only
  long-running services.
- **COULD-113** *(confirmed 2026-11-04)* — Trivy's Java DB mirror
  (`mirror.gcr.io/aquasec/trivy-java-db:1`) 404ed twice on 2026-10-25, on
  `dev` and on PR 421, failing the image scan without scanning anything; the
  remedy is a manual re-run ([ci-playbook](../ci-playbook.md#vulnerability-scan)).
  Configure a second Java DB repository (`ghcr.io/aquasecurity/trivy-java-db:1`)
  for Trivy to fall back to, after confirming that the Trivy version the
  pinned `trivy-action` runs accepts more than one.
- **COULD-114** *(confirmed 2026-11-04)* — A full disk has twice failed work
  with an error that does not say so at first sight: Postgres in Testcontainers
  could not write its WAL (Docker's build cache, 2026-10-30), and a Gradle
  release build could not extract an AAR (several worktrees' Xcode
  DerivedData, 2026-10-31; both in [common-failures](../common-failures.md)).
  Every worktree adds both caches. The SessionStart hook that runs
  `prune-worktrees.mjs` could warn, in the session only, when free space is
  low and name the two caches; the `worktree` skill's teardown could delete
  the removed worktree's own DerivedData.

- **COULD-115** *(confirmed 2026-11-05)* — The mobile transport's failure log
  (`mobile/src/lib/api/registerTransport.ts`) writes an error line for every
  status of 400 or above. Nothing the app calls today treats a 4xx as an
  expected answer, but a screen that does (a 404 read as "no such beer", a 409
  as a lost race) would write one error line per visit, which
  [ADR-0013](../adr/0013-logging-conventions.md) says an anticipated status
  should not. Log a status only where the feature that reads it calls it a
  failure, by moving the line from the transport to `httpFailure`'s callers, or
  let a call say which statuses it expects.
- **COULD-116** *(confirmed 2026-11-05)* — The same log line carries the request's
  path unredacted. No call the app makes today has a user's name in its path,
  but a public profile or public cellar read would
  (`/api/v1/profiles/{username}`), and writing it to the device log breaks
  ADR-0013's no-user-identity rule. When the first such call is added, log the
  operation's path template instead of the built URL, or add a check that fails
  a logged path with a segment the generated client takes as a parameter.

- **COULD-108** *(confirmed 2026-11-04)* — Two worktrees, one in phone mode and
  one not, have never been run beside each other. [Iteration 10 task 02](iteration-10/02-the-phone-reaches-the-stack.md)
  built `make phone-mode` to replace the machine's `tailscale serve` forwards
  with the calling worktree's four ports ([ADR-0097](../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)),
  and shows it on one worktree (forwards made, replaced on a switch, removed);
  the claim that a second worktree's switch leaves the first's forwards gone
  rather than colliding is reasoned from `tailscale serve reset` and not shown.
  To close it: stand up a second worktree's stack (`make stack-env`, `make up`),
  run `make phone-mode` in each in turn, and read `tailscale serve status`
  after each. If it shows a collision, the fix is in `scripts/phone-mode.mjs`,
  and the ADR's last unverified point is amended either way.

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
