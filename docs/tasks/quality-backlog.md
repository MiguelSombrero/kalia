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

**Highest issued:** MUST-25 · SHOULD-118 · COULD-137

## MUST

None open.

## SHOULD

- **SHOULD-80** *(confirmed 2026-11-05)* **[needs decision]** — A rejected
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
- **SHOULD-109** *(confirmed 2026-11-05)* **[needs decision]** — Keycloak's
  missing "Back to application" link is still assigned to iteration 10, which
  closed without it: `docs/architecture.md:1205-1210` ("…which is iteration
  10's") and `docs/tasks/backlog.md:291-299` ("part of iteration 10's
  distribution work", also carrying a Keycloak version number that belongs
  only in `keycloak/Dockerfile`). Options: park it in the backlog's cost list,
  since iOS universal links need the paid developer program, and point §6
  there; or schedule the free Android App Link or a web bounce page to
  `kalia://auth/callback` in a named iteration.
- **SHOULD-112** *(confirmed 2026-11-05)* **[needs decision]** —
  `docs/tasks/backlog.md`'s "Mobile client" section states decided things as
  open, in the present tense: `frontend/app/api/` and `lib/api/generated/`
  (`:187`, `:210-218`), "npm workspaces, which this repo does not have", "none
  is decided" (`:222`), crash reporting "taken by Iteration 10" (`:122`, but
  ADR-0098 deferred it), §5 "titled 'Frontend design'" and ADR-0012's spec
  rejection "worth revisiting" (`:304-315`). ADR-0092–0098 have since decided
  these. Options: prune the analysis to one-line pointers at those ADRs, or
  keep it marked "as written 2026-08-08" and correct the table row and the
  "worth knowing" items.
- **SHOULD-116** *(confirmed 2026-11-05)* **[needs decision]** —
  [common-failures](../common-failures.md) misses most failures seen only in
  CI. Unlogged since 2026-10-27: the Gates "Range" failures on PRs 467 and 470
  (four runs); the `check-pr-body` false positives on PRs 513 and 515
  (SHOULD-117); `dev` run 41076206163 (`plexus-xml` not found); three
  vulnerability-scan image builds on 2026-11-01 (`Non-resolvable parent POM`);
  CodeQL on PR 541; a full disk on PR 534; and the `PluginError` that fix
  branch #538 exists for. The backlog's counts come out low as a result:
  COULD-110 cited three Range rows for five PRs, COULD-111 two CodeQL hits for
  four. [ADR-0084](../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)
  relies on agents logging as they go, which holds for local failures and not
  for workflows other than `CI` or for Dependabot branches. Options: widen the
  `worktree` skill's Start step 2 to every workflow and to PR branches; have
  the sweep collect red runs itself from `gh run list` and narrow the log to
  local failures that leave no trace; or accept the undercount.
- **SHOULD-118** *(confirmed 2026-11-05)* **[needs decision]** — Tasks still
  close after their implementation merges, a regression of COULD-91, which
  iteration 10 task 20 settled with "every criterion checkable before merge"
  (`docs/tasks/template.md:210` and both refine skills). Iteration 10 task 22
  was implemented in #525 and closed by #527, its criterion 4 needing a run its
  own branch could not produce; task 07 ticked every criterion in #523 but
  stayed `refined`, and #533 existed only to flip its status. Task 22 was
  refined in #524, which skipped `/code-review`, as refinement PRs routinely
  do (#464, #477, #478, #503, #504, #516, #517, #518, #524, #537), while
  where review did run on a refinement it caught this class (#474, #476,
  #540, #548). Neither refine skill has a review step. Options: add a review
  step to both refine skills, aimed at whether each criterion can be checked
  on its own branch; have `check-pr-body` fail a PR that ticks every criterion
  of a task but leaves its `Status` short of `done` (which would have caught
  #523); or accept close-out PRs and amend task 20's decision.

## COULD

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).
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
- **COULD-114** *(confirmed 2026-11-05)* — A full disk has three times failed
  work with an error that does not say so at first sight: Postgres in
  Testcontainers could not write its WAL (Docker's build cache, 2026-10-30), a
  Gradle release build could not extract an AAR (several worktrees' Xcode
  DerivedData, 2026-10-31; both in [common-failures](../common-failures.md)),
  and `make verify`'s Android step hit `No space left on device` on PR 534,
  unlogged, after the `worktree` skill had gained its "check free disk"
  instruction — so a skill step alone did not prevent it. Every worktree adds
  both caches. The SessionStart hook that runs
  `prune-worktrees.mjs` could warn, in the session only, when free space is
  low and name the two caches; the `worktree` skill's teardown could delete
  the removed worktree's own DerivedData.
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
- **COULD-119** *(confirmed 2026-11-05)* **[needs decision]** — The web
  hand-builds `apiError("http", …, { status })` at 17 sites
  (`web/features/{catalog,cellar,profile}/api.ts`) where mobile uses
  `@kalia/api`'s `httpFailure()`, which also carries the response's trace id;
  and `isLocale` is written twice (`web/i18n/settings.ts:6`,
  `mobile/src/lib/i18n/resolveLocale.ts:3`) beside the `locales` both import
  from `@kalia/locales`. Options: move the web to `httpFailure` and `isLocale`
  into `@kalia/locales`; or keep both, since the web logs the trace id in
  `mutator.ts` and shows no error reference.
- **COULD-120** *(confirmed 2026-11-05)* **[needs decision]** — `@kalia/api`
  is generated with `client: "react-query"` (`packages/api/orval.config.ts:14`)
  and so peer-depends on an exact React and on TanStack Query
  (`packages/api/package.json`), yet neither app imports a generated hook —
  only the plain functions. The "platform-neutral" package ties Next.js's
  React and the Expo SDK's React together, and offers hooks that would bypass
  the feature-owned hooks ADR-0041 requires. Options: generate `client:
  "fetch"` and drop the peer dependencies, or keep the hooks for a planned use
  and say so in `packages/README.md`.
- **COULD-121** *(confirmed 2026-11-05)* — `mobile/eslint.config.js:77-85`
  lets `app`, `feature`, `components` and `lib` import `src/testing/`
  (`fakeTokenStore.ts`, `renderWithLocale.tsx`), so a fake token store could
  ship in production code with no lint failure. Allow `testing` only from
  `*.test.ts(x)` files, through a file category.
- **COULD-123** *(confirmed 2026-11-05)* — How to regenerate the API client is
  restated in `web/README.md:262`, `mobile/README.md:594-595`,
  `docs/architecture.md:751-752` and `docs/ci-playbook.md:46-48`, away from its
  home in `packages/README.md:18-23`; the web and mobile copies already drop
  the `make openapi-spec` step that must come first after an API change.
  Replace each with a one-line pointer.
- **COULD-124** *(confirmed 2026-11-05)* — Facts restated away from their one
  home: the API compatibility rules (the `openapi-breaking-ignore.txt` waiver,
  a new `oneOf` member passing in a 4xx and failing in a 2xx) in both
  `docs/architecture.md:670-678` and `packages/README.md:38-42`;
  `mobile/README.md:495-498` repeating the Dependabot-ignored SDK packages of
  `.github/dependabot.yml`, whose comment points back at the README;
  `mobile/README.md:488-490` giving a narrower trigger for the `mobile` CI job
  than `scripts/ci-changes.mjs`, which calls itself the one place that policy
  is stated; and the Metro port 8082 reason in `mobile/README.md:118-120`,
  `README.md:107-108` and `scripts/stack-ports.mjs`.
- **COULD-127** *(confirmed 2026-11-05)* — Maven Central has failed
  `dependency:go-offline` in four CI runs across jobs in about two days (`dev`
  run 41076206163 on 2026-10-30; runs 41281600049, 41281630568, 41283077204 on
  2026-11-01, `Non-resolvable parent POM`), but only `mobile-e2e` retries it
  (`ci.yml:386-394`). `vulnerability-scan.yml:55-57`, a required check, runs
  `docker compose build` with no retry, the playbook's vulnerability-scan
  section has no entry, and its E2E entry's own condition ("fix something only
  if the same artifact fails again") is met.
- **COULD-129** *(confirmed 2026-11-05)* **[needs decision]** — A pull request
  that completes no task has no defined gates: #490 (a `check-pr-body.mjs`
  change) and #492 (a test fix) recorded `/code-review` "skipped — reviewed by
  the product owner", though CLAUDE.md's Roles say the product owner does not
  code, and agent code commits on Dependabot PRs (be3d9a8b on #513, 37c6c6d8
  on #515) carry no gate record. `check-pr-body` gates only task-completing PRs.
  The decision: which gates apply to a PR with no task file.
- **COULD-134** *(confirmed 2026-11-06)* — CodeQL alert 8,
  `js/clear-text-logging` on `scripts/mobile-native.mjs:121`
  (`console.error(error.message)`), has been open on `dev` since 2026-11-04,
  and the local stand-in `scripts/check-clear-text-logging.mjs` does not reach
  it: the alert names no flow path, and the one candidate in that file, an
  emulator name from `process.env.AVD` built into an Error, is a direct read
  CodeQL passes elsewhere. It fails no pull request, being on `dev` already.
  Find the flow (the alert's page shows it to the owner), make the message say
  what failed without the value, and add the flow's shape to the stand-in's
  fixtures if it can follow it.
- **COULD-135** *(confirmed 2026-11-06)* — CodeQL alert 5,
  `js/incomplete-sanitization` on `scripts/sync-indexes.mjs:26`, has been open
  on `dev` since 2026-10-14: the index-cell writer escapes `|` and not `\`, so
  a title holding `\|` is written as `\\|`, whose pipe then ends the cell. No local
  check covers that query.
- **COULD-136** *(confirmed 2026-11-06)* — `web/features/admin-suggestions/OutcomePanel.tsx`
  builds a success box (icon cell, ink edge, message) that `Toast` and `ErrorAlert`
  each build too; a success counterpart to `ErrorAlert` in `components/ui/` would
  leave one copy to keep in step.
- **COULD-137** *(confirmed 2026-11-06)* — `web/e2e/admin-review.spec.ts`'s
  `catalogShows` asserts a beer's absence after `networkidle`, which can pass
  before the catalog's streamed results render, so "a rejected beer is withheld"
  could pass vacuously; it needs a positive signal that the results are in.

## Retired

Findings lifted into a task that is not yet `done`, each noting where it
went; pruned as described above.

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
