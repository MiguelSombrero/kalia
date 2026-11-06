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

**Highest issued:** MUST-25 · SHOULD-118 · COULD-133

## MUST

- **MUST-24** *(confirmed 2026-11-05)* — The docs say iteration 10.5 has not
  started, though three of its tasks are `done` and nine more `refined`.
  `docs/architecture.md:27` reads "No iteration is in progress", written by
  iteration 10's close after 10.5 tasks 01–03 had merged; `docs/roadmap.md`
  marks 10.5 `⬜ Todo` and calls its task files "seeded at
  `needs-refinement`". `implement-task` step 11 says how to update these lines
  when an iteration closes, but no step marks one in progress when its first
  task finishes. Mark 10.5 `🔄 In progress`, reword §1, drop the "seeded"
  sentence, and add the missing step.
- **MUST-25** *(confirmed 2026-11-05)* — `docs/ci-playbook.md`, the page a red
  check is looked up in, still names the pre-rename `frontend/`: the heading at
  `:50`, `frontend/playwright.config.ts` (`:99`), `frontend/e2e/support/*`
  (`:167`, `:195`), "the frontend container" (`:182`, `:185`), and an entry
  (`:307-318`) for `make verify` failing at `frontend-build` whose remedy,
  `(cd frontend && npm ci)`, is wrong twice: the target is `web-build`, and
  with npm workspaces dependencies install by `npm ci` at the repository root.
  The CI job is "Web and packages (npm)" (`ci.yml`).

## SHOULD

- **SHOULD-102** *(confirmed 2026-11-05)* — Proposing a new brewery whose name
  and country another contributor holds as `PENDING` answers
  `DuplicateBreweryProblem` with that brewery's id, name and country, and the
  add-beer dialog offers "Use it"; choosing it then answers `404`
  (`findVisibleById` hides the row), the dead end SHOULD-72 closed for beers.
  `ContributionService.newBrewery` has the same lookup as `existingBrewery`
  without the visibility check; it wants the same anonymous `409`, or a
  decision that a brewery's name may be disclosed. Found while implementing
  [iteration 10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
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
- **SHOULD-103** *(confirmed 2026-11-05)* **[needs decision]** — The `admin`
  role will ride in the mobile app's offline refresh token, which never rotates
  and has no maximum lifespan. `keycloak/realm-export.json` sets
  `revokeRefreshToken: false` and `offlineSessionMaxLifespanEnabled: false`;
  `kalia-mobile` pins no client scopes, so it inherits `roles`; the app asks
  for `offline_access` (`mobile/src/lib/auth/keycloakClient.ts:60`).
  [ADR-0101](../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md) admits the role on
  `/api/v1/admin/**` from any client and calls the mobile token carrying it
  "Neutral", without weighing ADR-0095's accepted replay of a stolen phone's
  refresh token. Once 10.5 task 04 lands, an admin signed in on the phone —
  the product owner, on the one phone the app is on — holds an admin
  credential that works through the edge for as long as it is refreshed every
  30 days, against the web session's 10 hours. Options: the admin rule also
  requires `azp == kalia-web`, pinned by a test with a `kalia-mobile` token;
  an explicit `kalia-mobile` scope list without `roles`, checked by the realm
  drift check; or accept it and amend ADR-0101's consequence and ADR-0095's
  revisit trigger to name admin.
- **SHOULD-104** *(confirmed 2026-11-05)* — `GET /api/v1/cellar/holdings`
  answers 500 to `?beerIds=<uuid>,` (a trailing comma), `?beerIds=,` or
  `?beerIds=&beerIds=<uuid>`: Spring converts a blank element to `null`,
  `@Size` on `List<UUID>` (`CellarController.java:87`) lets it through, and
  `Set.copyOf` (`CellarService.java:62`) throws. A malformed request is logged
  and counted as an unexpected failure. Declare `List<@NotNull UUID>` so the
  validation handler answers 400 on `beerIds`, and add the trailing-comma case
  to `CellarHoldingsApiIT`.
- **SHOULD-105** *(confirmed 2026-11-05)* — The feed's 30-day window bounds
  what is served, not what is scanned. Both reads in `FeedLineRepository`
  filter `occurred_at >= :cutoff` and order by `sequence_number DESC`, and
  `feed.line` has no index on `occurred_at` (`V007__feed_schema.sql`), so when
  fewer than `size + 1` lines match, Postgres reads every older row before it
  stops. The table keeps every row (ADR-0058) and the endpoint is anonymous: a
  quiet instance scans all history on each front-page render, and a `?before=`
  cursor near the window's edge does the same on any instance. Index
  `occurred_at`, or turn the cutoff into a lower bound on `sequence_number`,
  and pin the plan in a test like `BeerSearchIndexIT`.
- **SHOULD-106** *(confirmed 2026-11-05)* — The mobile catalog's first page is
  cached under `["catalog", "beers", "first-page"]`
  (`mobile/src/features/catalog/hooks/useBeers.ts`), a key naming no viewer,
  though the backend adds the caller's own pending beers to it (ADR-0091), and
  `signIn`/`signOut` in `mobile/src/lib/auth/tokenStore.ts` never touch the
  query client. User A signs out, B signs in within the 60 s `staleTime`, and
  B's Catalog tab shows A's pending suggestion; a user who just signed in does
  not see their own. Only `useMyProfile` guards against this. Clear the query
  client (or the viewer-dependent queries) on every sign-in and sign-out.
- **SHOULD-107** *(confirmed 2026-11-05)* — `docs/architecture.md` §4
  (`:621-625`) says the web app is the API's only caller, so "endpoints are
  client-agnostic resources" holds by circumstance. The mobile app has called
  `/beers`, `/profile` and `/app-config` directly since iteration 9
  (`mobile/src/features/*/api.ts`, ADR-0095); the rule is load-bearing now and
  the paragraph should say so.
- **SHOULD-108** *(confirmed 2026-11-05)* **[needs decision]** —
  `docs/architecture.md:656-657` states as fact that a client falls back on an
  enum value it does not know ([ADR-0093](../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  but nothing keeps the promise. Orval emits closed unions; the web's
  `bottleFacts.ts` maps `ContainerType` exhaustively, so `BottleTile` renders
  `t(undefined)` for a new value, and `editBottleSchema.ts`'s `z.enum` refuses
  to save such a bottle. Mobile reads no enum yet; iteration 12's cellar and
  10.5's outcome codes are where it becomes real. ADR-0093's Bad consequence
  admits neither client was audited. Options: a mechanism (open enums from an
  Orval override, or a shared label-with-fallback helper in `@kalia/api` with a
  lint rule), or narrow the rule to mobile, since the web deploys with the
  backend, and correct §4.
- **SHOULD-109** *(confirmed 2026-11-05)* **[needs decision]** — Keycloak's
  missing "Back to application" link is still assigned to iteration 10, which
  closed without it: `docs/architecture.md:1205-1210` ("…which is iteration
  10's") and `docs/tasks/backlog.md:291-299` ("part of iteration 10's
  distribution work", also carrying a Keycloak version number that belongs
  only in `keycloak/Dockerfile`). Options: park it in the backlog's cost list,
  since iOS universal links need the paid developer program, and point §6
  there; or schedule the free Android App Link or a web bounce page to
  `kalia://auth/callback` in a named iteration.
- **SHOULD-110** *(confirmed 2026-11-05)* — The root README describes a
  web-and-backend project. Its Architecture paragraph (`README.md:156-159`)
  presents the BFF as the whole client story, though the mobile app is the
  primary UI and calls the API through the edge; its tech stack (`:172-283`)
  breaks its own "add a technology when you add it to a manifest" rule for
  everything `mobile/package.json` installs (Expo, React Native, Expo Router,
  expo-auth-session, expo-secure-store, AsyncStorage, jest-expo, React Native
  Testing Library) and for Maestro; "Development approach" (`:358-360`) names
  only Playwright for user flows, and the base-image list omits nginx.
- **SHOULD-111** *(confirmed 2026-11-05)* **[needs decision]** — The root
  README's repository tree (`README.md:290-295`) lists the backend modules
  without `appconfig/` or the module-neutral `web/`, though §3's table, which
  `ArchitectureDocumentationTest` asserts, is the module list's home; and the
  workspace layout is stated both in that tree and in `docs/architecture.md`
  §2 (`:104-115`). Options: add the two packages to the tree; or point the
  tree's module lines at §3 and reduce §2's layout block to a pointer at the
  README, the home CLAUDE.md names.
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
- **SHOULD-113** *(confirmed 2026-11-05)* — `README.md:226-234`, added by
  iteration 10 task 19, records the npm-overrides re-test with version
  numbers: "`next` 16.4.5 (the latest) and 16.4.3 (the pin)" and "the 0.35
  line" of `sharp`. "The latest" goes false on the next release, and the pins
  restate `web/package.json` and `mobile/package.json`, against the README's
  own preamble and CLAUDE.md's "versions live in the manifest". Keep "No
  `overrides`" and the re-test trigger; drop the numbers and the history.
- **SHOULD-114** *(confirmed 2026-11-05)* — `mobile/README.md:225-227` says
  `make mobile-doctor ARGS=ios-device` and `make mobile-ios-device` "appear
  when it merges"; both are in the `Makefile` on `dev`. A sentence written on
  iteration 10 task 04's branch that task 19 missed; delete it.
- **SHOULD-115** *(confirmed 2026-11-05)* **[needs decision]** — The merge
  race [ADR-0046](../adr/0046-edit-time-checks-and-one-verify-gate.md) accepted
  happened a second time, a regression of SHOULD-89. #542 filed SHOULD-99 to
  COULD-114; #543, branched before it merged, added the **Highest issued**
  line from a backlog without them; each was green on its own head, and `dev`
  went red on `check-tasks` (run 41827668769, 2026-11-04) until an unrelated
  branch (#545) fixed it, while every worktree cut from `dev` failed
  `verify-fast`. The common-failures row records the red check but not the
  race. ADR-0046 (`:146-170`) says the up-to-date requirement "reopens when the
  failure log shows the race a second time"; nothing reopened it. Options: turn
  the strict up-to-date requirement back on; add a required
  `pull_request`-triggered job running only `make check` (about a second) on
  the merge ref, which would have failed #543; or accept the race and amend
  the ADR with the second occurrence.
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
- **SHOULD-117** *(confirmed 2026-11-05)* — `check-pr-body` fails pull requests
  that complete no task, because `.github/workflows/pr-body.yml:38` diffs
  `"$BASE_SHA"...HEAD`: `HEAD` is the merge ref, built on the current `dev`,
  and `pull_request.base.sha` lags it, so every task set `done` on `dev` in
  between reads as completed by this PR. Dependabot PRs 513 and 515 failed all
  seven gate lines this way, and 515 merged with the check red, since the
  workflow sits outside `ci-passed`. Diff `HEAD^1...HEAD`, the merge ref's
  first parent being the current base.
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
- **COULD-109** *(confirmed 2026-11-04)* — A root `scripts/*.mjs` file that
  imports an npm package passes `make verify-fast` locally and fails in CI,
  because the `Static checks` job runs `make check` with no `npm ci` by
  design ([common-failures](../common-failures.md), the 2026-11-03 row,
  `ERR_MODULE_NOT_FOUND … 'sharp'`). Add a checker to `make check`, and so to
  the edit-time hook, that fails a root `scripts/` file importing anything
  other than a `node:` built-in or a relative path, and points at
  `mobile/scripts/` or a package's own scripts instead.
- **COULD-111** *(confirmed 2026-11-05)* **[needs decision]** — CodeQL has
  failed four pull requests on new script code that `verify-fast` passed, each
  query twice: `js/incomplete-multi-character-sanitization` on a single-pass
  comment strip (PR 434, and PR 545 in `mobile/scripts/check-cleartext.mjs`,
  after this entry had named the remedy) and `js/clear-text-logging` on a
  message carrying a `process.env` value (PR 500, and PR 541 in
  `scripts/check-compose.mjs`). `docs/ci-playbook.md` still has no CodeQL
  section. Nothing local runs those queries. The decision left open:
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
- **COULD-115** *(confirmed 2026-11-05)* — The mobile transport's failure log
  (`mobile/src/lib/api/registerTransport.ts`) writes an error line for every
  status of 400 or above. Nothing the app calls today treats a 4xx as an
  expected answer, but a screen that does (a 404 read as "no such beer", a 409
  as a lost race) would write one error line per visit, which
  [ADR-0013](../adr/0013-logging-conventions.md) says an anticipated status
  should not. Log a status only where the feature that reads it calls it a
  failure, by moving the line from the transport to `httpFailure`'s callers, or
  let a call say which statuses it expects.
- **COULD-116** *(confirmed 2026-11-05)* **[needs decision]** — The same log
  line carries the request's path unredacted. No call the app makes today has
  a user's name in its path, but a public profile or public cellar read would
  (`/api/v1/profiles/{username}`), and `mobile/README.md` reads ADR-0013 as a
  no-user-identity rule. The premise that this is mobile-only and future does
  not hold: every public-cellar visit on the web already writes the username
  with the client's address in three logs — the backend's `RequestLogFilter`
  (raw path), the web's `mutator.ts` (`path: pathOf(url)` for
  `/api/v1/cellars/{username}`) and the edge's access log
  (`/[locale]/cellars/{username}`), including misspelled names and private
  cellars that answer 404. ADR-0013 itself says "secrets/PII". The decision:
  a public username is not identity (close this entry and amend the mobile
  README), or every tier logs route templates — the backend's best-matching
  pattern, the operation's path template in both transports, a path map in
  nginx.
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
- **COULD-118** *(confirmed 2026-11-05)* — `addBeerAction`
  (`web/features/catalog/actions.ts:83-92`) holds a valid 409 with
  `existingBeerId`, then awaits `getBeer` uncaught to look up its name; when
  that read 5xxs or times out, the dialog shows the generic failure instead of
  "this beer exists". Catch it and fall back as the code already does for a
  missing beer.
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
- **COULD-122** *(confirmed 2026-11-05)* — Smaller staleness in architecture
  and ADR text: the 2026-10-24 amendment to
  [ADR-0002](../adr/0002-spring-modulith.md) lists the modules without
  `appconfig`; `docs/architecture.md:1031` says only `edge` is published,
  though the dev overlay publishes postgres, valkey and mailpit on loopback
  (`docker-compose.override.yml`); §8 describes unbuilt admin behaviour
  (`:1332`) beside text still describing `make moderate` (`:1354-1361`), under
  a trade-off titled "Migrations over an admin UI" (`:1343`); ADR-0090's rate
  table (`:97`, and `:35`, `:47-48`) names a `frontend` zone that
  `edge/nginx.conf` calls `web`; `docs/adr/README.md` speaks of "the two
  READMEs" (`:6`) and its gloss of ADR-0032 (`:10-14`) drops the "binds work
  now" test CLAUDE.md keeps; `keycloak/README.md` omits `realm-swagger.json`
  from its layout and says "Both run" for the three checks `make
  keycloak-check` runs (`check-keycloak-pkce-flow.mjs` missing).
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
- **COULD-125** *(confirmed 2026-11-05)* — `CLAUDE.md` ("New dependencies")
  and `README.md:176-177` list where versions live as `backend/pom.xml`,
  `web/package.json`, compose files, Dockerfiles and workflows, omitting
  `mobile/package.json`, `packages/*/package.json`, the root `package.json` and
  the toolchain pin files (`.node-version`, `.xcode-version`,
  `.tailscale-version`, `mobile/.java-version`) that `mobile/README.md` and
  `mobile-doctor.mjs` treat as homes, so an agent applying the "already pinned
  in a manifest" exception would not recognise a mobile pin. CLAUDE.md is at
  197 of its 200 lines.
- **COULD-126** *(confirmed 2026-11-05)* **[needs decision]** —
  `/actuator/prometheus` accepts any signed-in user's token
  (`SecurityConfig.java:59-62`; `ObservabilityIT` reads it with an ordinary
  user). Not exploitable today: the edge answers 404 for `/actuator/*`, and the
  BFF's transport refuses dot segments. The only protection is the network
  layout, and once 10.5 task 04 adds an admin role, "any self-registered
  account" is the wrong bar. Options: require `admin` on `/actuator/**` except
  health, or record in ADR-0088 that the network is the boundary.
- **COULD-127** *(confirmed 2026-11-05)* — Maven Central has failed
  `dependency:go-offline` in four CI runs across jobs in about two days (`dev`
  run 41076206163 on 2026-10-30; runs 41281600049, 41281630568, 41283077204 on
  2026-11-01, `Non-resolvable parent POM`), but only `mobile-e2e` retries it
  (`ci.yml:386-394`). `vulnerability-scan.yml:55-57`, a required check, runs
  `docker compose build` with no retry, the playbook's vulnerability-scan
  section has no entry, and its E2E entry's own condition ("fix something only
  if the same artifact fails again") is met.
- **COULD-128** *(confirmed 2026-11-05)* — The `worktree` skill says `claude
  --worktree <name>` "does the equivalent" (`SKILL.md:64-66`), but it creates
  `claude/<name>-<hash>` branches against CLAUDE.md's naming rule and the same
  step's. Merged under such names: #416, #476, #522; this sweep's own session
  started on one. Tell the agent to `git branch -m` before the first push.
- **COULD-129** *(confirmed 2026-11-05)* **[needs decision]** — A pull request
  that completes no task has no defined gates: #490 (a `check-pr-body.mjs`
  change) and #492 (a test fix) recorded `/code-review` "skipped — reviewed by
  the product owner", though CLAUDE.md's Roles say the product owner does not
  code, and agent code commits on Dependabot PRs (be3d9a8b on #513, 37c6c6d8
  on #515) carry no gate record. `check-pr-body` gates only task-completing PRs.
  The decision: which gates apply to a PR with no task file.
- **COULD-130** *(confirmed 2026-11-05)* — `design-task` step 9
  (`.claude/skills/design-task/SKILL.md:99-101`) lists `make verify` among
  `implement-task`'s gates, where `implement-task` step 9 and CLAUDE.md make
  `make verify-fast` the local gate.
- **COULD-131** *(confirmed 2026-11-05)* — The review queue's contributor
  counts (`BeerRepository.countPendingAndRejectedByContributor`, iteration 10.5
  task 05) can use `beer_pending_contributor_idx` only for `PENDING`; the
  `REJECTED` half scans `catalog.beer`, imported rows included, on every admin
  page. Harmless while few beers are rejected; add a partial index on
  `contributor_id` where it is not null when rejections accumulate, and check
  the plan as `BeerSearchIndexIT` does.
- **COULD-132** *(confirmed 2026-11-05)* — `SuggestionDecisionDto.outcome`
  (iteration 10.5 task 06) is typed `ReviewOutcome`, so the spec and generated
  client allow `REMOVED` on the `200` of an approval or rejection, a value only
  the `409` can carry. Give the `200` its own two-value enum when task 07 or 08
  next regenerates the client; the change is additive-breaking for a client that
  switches on it, so do it before an app build depends on it.
- **COULD-133** *(confirmed 2026-11-06)* — `SuggestionReviewService.approveEdited`
  has no retry on a unique-index race. An edit that renames a pending brewery
  or a beer passes its duplicate read, a contributor's add of the same name
  commits first, and the flush answers `500` where the add path retries once and
  answers the documented `409` (ADR-0057, `ConcurrentAddBeerApiIT`). An admin
  re-submitting gets the `409`; fix is the add path's `@Retryable` with a race
  test. Found by the review of iteration 10.5 task 07.

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
