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

**Highest issued:** MUST-25 · SHOULD-118 · COULD-143

## MUST

None open.

## SHOULD

None open.

## COULD

- **COULD-136** *(confirmed 2026-11-06)* — `web/features/admin-suggestions/OutcomePanel.tsx`
  builds a success box (icon cell, ink edge, message) that `Toast` and `ErrorAlert`
  each build too; a success counterpart to `ErrorAlert` in `components/ui/` would
  leave one copy to keep in step.

## Retired

Findings lifted into a task that is not yet `done`, each noting where it
went; pruned as described above.

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
- ~~COULD-109~~ (a root script test importing an npm package, red only in CI's Static checks) — resolved in [iteration-10.5 task 21](iteration-10.5/21-a-failure-ci-would-report-is-caught-before-the-push.md): `make check` runs `scripts/check-script-imports.mjs`.
- ~~COULD-111~~ (CodeQL's two script queries reaching only CI) — resolved in [iteration-10.5 task 21](iteration-10.5/21-a-failure-ci-would-report-is-caught-before-the-push.md): `make check` runs a local stand-in for each, and the CodeQL CLI was not adopted.
- ~~MUST-24~~ (the docs saying iteration 10.5 has not started) — lifted into [iteration-11 task 12](iteration-11/12-the-process-documents-name-what-exists.md).
- ~~MUST-25~~ (`ci-playbook.md` still naming `frontend/`) — lifted into [iteration-11 task 12](iteration-11/12-the-process-documents-name-what-exists.md).
- ~~COULD-125~~ (the lists of where a version lives omitting the mobile and package manifests) — lifted into [iteration-11 task 12](iteration-11/12-the-process-documents-name-what-exists.md).
- ~~COULD-128~~ (the `worktree` skill's `claude --worktree` branch names) — lifted into [iteration-11 task 12](iteration-11/12-the-process-documents-name-what-exists.md).
- ~~COULD-130~~ (`design-task` step 9 naming `make verify`) — lifted into [iteration-11 task 12](iteration-11/12-the-process-documents-name-what-exists.md).
- ~~SHOULD-107~~ (§4 saying the web is the API's only caller) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~SHOULD-110~~ (the root README describing a web-and-backend project) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~SHOULD-111~~ (the README tree and §2 restating the module and workspace layout) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~SHOULD-113~~ (the README's overrides note restating versions) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~SHOULD-114~~ (`mobile/README.md` saying two `make` targets appear when a PR merges) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~COULD-122~~ (smaller staleness in architecture and ADR text) — lifted into [iteration-11 task 13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).
- ~~SHOULD-99~~ (`ProfileServiceModuleIT`'s concurrent sign-in test failing at random) — lifted into [iteration-11 task 14](iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md).
- ~~SHOULD-100~~ (no testing rule for a test that races itself) — lifted into [iteration-11 task 14](iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md).
- ~~SHOULD-115~~ (the merge race ADR-0046 accepted happening a second time) — lifted into [iteration-11 task 15](iteration-11/15-a-pull-request-is-checked-against-the-base-it-will-merge-into.md).
- ~~SHOULD-117~~ (`check-pr-body` failing pull requests that complete no task) — lifted into [iteration-11 task 15](iteration-11/15-a-pull-request-is-checked-against-the-base-it-will-merge-into.md).
- ~~SHOULD-106~~ (the mobile catalog's first page cached under a key naming no viewer) — lifted into [iteration-11 task 16](iteration-11/16-signing-in-or-out-clears-what-the-last-viewer-saw.md).
- ~~COULD-115~~ (the mobile transport logging every 4xx as an error) — lifted into [iteration-11 task 17](iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md).
- ~~COULD-116~~ (the request path logged unredacted) — lifted into [iteration-11 task 17](iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md).
- ~~SHOULD-108~~ (a client's fallback on an unknown enum value being a promise nothing keeps) — lifted into [iteration-11 task 18](iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md).
- ~~COULD-132~~ (the `200` of a review decision allowing `REMOVED`) — lifted into [iteration-11 task 18](iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md).
- ~~SHOULD-103~~ (the `admin` role riding in the mobile app's offline refresh token) — lifted into [iteration-11 task 19](iteration-11/19-decision-how-far-the-admin-role-reaches.md).
- ~~COULD-126~~ (`/actuator/prometheus` accepting any signed-in user's token) — lifted into [iteration-11 task 19](iteration-11/19-decision-how-far-the-admin-role-reaches.md).
- ~~SHOULD-102~~ (a pending brewery's id disclosed, then answering `404`) — lifted into [iteration-11 task 20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md).
- ~~SHOULD-104~~ (`GET /api/v1/cellar/holdings` answering 500 to a blank `beerIds` element) — lifted into [iteration-11 task 20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md).
- ~~COULD-118~~ (`addBeerAction` showing the generic failure when the name lookup fails) — lifted into [iteration-11 task 20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md).
- ~~COULD-133~~ (`approveEdited` answering `500` on a unique-index race) — lifted into [iteration-11 task 20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md).
- ~~SHOULD-105~~ (the feed's window bounding what is served, not what is scanned) — lifted into [iteration-11 task 21](iteration-11/21-reads-that-scan-history-are-indexed-and-their-plans-pinned.md).
- ~~COULD-131~~ (the review queue's `REJECTED` count scanning the catalog) — lifted into [iteration-11 task 21](iteration-11/21-reads-that-scan-history-are-indexed-and-their-plans-pinned.md).
- ~~SHOULD-80~~ (rejected suggestions leaving the pending count) — lifted into [iteration-11.5 task 18](iteration-11.5/18-rejected-suggestions-cannot-fill-the-review-queue-without-end.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-101~~ (a common-failures row recording a defect with no owner) — lifted into [iteration-11.5 task 22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-109~~ (Keycloak's "Back to application" link assigned to a closed iteration) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-112~~ (the backlog's Mobile client section stating decided things as open) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-116~~ (common-failures missing most failures seen only in CI) — lifted into [iteration-11.5 task 22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-118~~ (tasks closing after their implementation merges) — lifted into [iteration-11.5 task 23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-26~~ (the password-reset page's `autocomplete="off"` username field) — lifted into [iteration-11.5 task 17](iteration-11.5/17-keycloaks-pages-ask-only-what-kalia-uses-and-say-what-each-is.md).
- ~~COULD-108~~ (two worktrees in and out of phone mode never run side by side) — lifted into [iteration-11.5 task 20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md).
- ~~COULD-112~~ (`docker compose up --wait` naming a one-shot service) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-113~~ (Trivy's Java DB mirror with no fallback) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-114~~ (a full disk failing work with an error that does not say so) — lifted into [iteration-11.5 task 20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md).
- ~~COULD-119~~ (the web hand-building HTTP failures and a second `isLocale`) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-120~~ (`@kalia/api` generated with React Query and its peer dependencies) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-121~~ (`src/testing/` importable from production code) — lifted into [iteration-11.5 task 11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md).
- ~~COULD-123~~ (how to regenerate the API client restated away from its home) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md).
- ~~COULD-124~~ (facts restated away from their one home) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md).
- ~~COULD-127~~ (Maven Central failures retried only in `mobile-e2e`) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-129~~ (a pull request completing no task having no defined gates) — lifted into [iteration-11.5 task 23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-134~~ (CodeQL alert 8 on `scripts/mobile-native.mjs`) — lifted into [iteration-11.5 task 21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md).
- ~~COULD-135~~ (CodeQL alert 5 on `scripts/sync-indexes.mjs`) — lifted into [iteration-11.5 task 21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md).
- ~~COULD-137~~ (`catalogShows` asserting an absence after `networkidle`) — lifted into [iteration-11.5 task 12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md).
- ~~COULD-138~~ (a gray shape beneath the central Add circle on the iPhone) — lifted into [iteration-11.5 task 15](iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md).
- ~~COULD-139~~ (`FontGate` waiting on the fonts with no deadline) — lifted into [iteration-11.5 task 14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md).
- ~~COULD-140~~ (`beerStyleGroup` imported from the `@kalia/api` root) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md).
- ~~COULD-141~~ (the font fallback rendering every weight as regular) — lifted into [iteration-11.5 task 14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md).
- ~~COULD-142~~ (the catalog list tests waiting on real timers) — lifted into [iteration-11.5 task 12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md).
- ~~COULD-143~~ (`showCatalogWith` applying its filters in an effect) — lifted into [iteration-11.5 task 11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md).
