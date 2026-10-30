# Common failures

An append-only log of the unexpected failures agents hit while working here,
one row per occurrence. It exists so that recurrence, which one session
cannot see, survives into the evidence `/quality-sweep`'s `process-quality`
dimension reads ([ADR-0084](adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
Nothing here is a fix: once a failure is understood, its fix goes to its own
home and a row names that home.

**Log a failure** when a tool call or command fails, and the cause is
tooling, the environment, or a wrong assumption on your part, and it cost a
retry. **Don't log** a product bug that a test caught, a test that is red on
purpose, or a failure that is normal operation (`grep` finding no match).

**How to write a row:**

- Append it to the end of the table, on the branch you are working on. Never
  edit or remove an earlier row. If you understand an old row better, write a
  new one.
- **Signature** is the stable part of the error, normalized: the error code
  or message with paths, line numbers, ports and ids removed. Keep it
  verbatim enough to grep. Never paste secrets, tokens or personal data.
- **Why** is your best explanation at the time. `unknown` is a valid answer.
  If the fix already has a home, link it.
- Don't count, group or deduplicate rows. The sweep does that.

| Date | Where | Signature | Why |
|---|---|---|---|
| 2026-10-25 | CI E2E, Keycloak 26.7.0 → 26.8.1-1 bump (PR 401) | `sign-up.spec.ts` "registering an already-used email says so explicitly": `getByText(/already exists\|already registered/i)` not found | Keycloak 26.8 reworded its duplicate-email message to "This email is already associated with an existing account"; behaviour unchanged, the spec's regex pinned the old wording. |
| 2026-10-25 | CI E2E, `@axe-core/playwright` 4.12.1 → 4.14.0 bump (PR 421) | `axe found WCAG 2.2 AA violations` — `label-content-name-mismatch`: "Text inside the element is not included in the accessible name" on the header's profile and `EN`/`FI` links | axe 4.14 adds the rule (WCAG 2.5.3). `jest-axe` stays on axe-core 4.12.1 and jsdom has no layout, so only the E2E scan sees it. Fixed in `AuthStatus.tsx` and `LocaleSwitcher.tsx`. |
| 2026-10-25 | CI `vulnerability-scan`, image scan (PR 421) | `failed to download Java DB … mirror.gcr.io/aquasec/trivy-java-db:1 … unexpected status code 404 Not Found` | Trivy's Java DB mirror 404ed; the filesystem scan of the same run found 0 vulnerabilities. Unrelated to the diff; a re-run is the remedy. |
| 2026-10-25 | `make verify`, frontend-test, after adding `unstable_rethrow` (`next/navigation`) to `lib/api/requestTrace.ts` | `AddBeerDialog.test.tsx` 20 tests: `Unable to find a label with the text of: Name`, run takes ~20 s | The test file mocks `next/navigation` with only `useRouter`, so the real `kaliaFetch` chain hit an undefined `unstable_rethrow` and the form never loaded. `lib/api` tests passed because they mock `requestTrace` themselves; fixed by mocking it once in `vitest.setup.ts` beside `sessionCookie`. |
| 2026-10-25 | CI CodeQL, new `scripts/check-pr-body.mjs` (PR 434) | `js/incomplete-multi-character-sanitization`: "This string may still contain `<!--`" on `body.replace(/<!--[\s\S]*?-->/g, "")` | A single-pass regex strip of HTML comments can leave a new `<!--` joined from the text around a removed one; the check passed `verify-fast`, which has no CodeQL. Fixed by stripping in a loop until stable (`stripComments`), with a test for the nested case. |
| 2026-10-26 | `npm run test:e2e`, iteration 8.5 task 10 on a fresh `dev` | `sign-in-out.spec.ts` "signing in as someone else while signed in starts a session of their own": `expect(me.status()).toBe(200)`, received 404 | Task 13 added the spec calling `GET /api/v1/me` after task 02 had removed that endpoint; each PR was green against its own base, so neither CI run saw the pair. The spec now reads `/api/v1/profile`. |
| 2026-10-26 | `sed -i 's/…/…\n…/' edge/nginx.conf` on macOS | the e2e run that was to measure under `limit_req_dry_run` enforced the limits instead (23 failures); no error from `sed` | BSD `sed` does not expand `\n` in a replacement, and `-i` without a suffix argument is parsed differently from GNU; the edit silently inserted nothing. Check the file after a scripted edit, and use `python3` or the Edit tool for multi-line changes. |
| 2026-10-26 | `make verify`, `backend-verify`, iteration 8.5 task 10 | `ObservabilityIT.aRequestRejectedBySecurityIsStillLogged`: captured output does not contain `GET /api/v1/cellar/bottles -> 401` | Passed in the same diff's first `make verify` and in 4 of 4 reruns alone, so a race: `RequestLogFilter` writes its line after the chain has answered, and the test reads the captured output as soon as the client has the 401. Not fixed here; unrelated to the diff. |
| 2026-10-26 | `make verify`, frontend-e2e (iteration 8.5 task 05, catalog-only diff) | `keyboard-flows.spec.ts` flow 2 (fi): `getByRole('heading', { level: 1, name: <username> })` not found; the page had navigated `/fi/profile` → `/fi/username-taken` | Passed alone 8 of 8 (`--repeat-each 4`) but failed in the full run, twice in the same fi slot; a profile row with the account's username already existed under another user id, which `ProfileService.create` reports as `UsernameTakenException`. Probably two first requests for a brand-new user racing, not this diff (catalog only). Unconfirmed on `dev`; no fix home yet. |
| 2026-10-26 | CI `ci-passed`, backend `mvn verify`, `ObservabilityIT.aRequestRejectedBySecurityIsStillLogged` | `Expecting actual: "{"@timestamp":…` to contain `"GET /api/v1/cellar/bottles -> 401"` (the 401 asserted, the log line absent from the captured output) | A race in the test, not a missing log line. `ProblemJsonSecurityHandlers` writes the 401 body with Jackson 3, which closes the servlet stream, so the client gets the response before `RequestLogFilter` logs in its `finally`. Reproduced deterministically by delaying that log 300 ms; only the 401 test failed. Fixed in `ObservabilityIT` by awaiting the line. |
| 2026-10-26 | CI E2E, PR 450 (merging `dev` after tasks 02 and 13 landed) | `sign-in-out.spec.ts` "signing in as someone else…": `expect(me.status()).toBe(200)` — `Received: 404` on `GET /api/v1/me` | Two PRs that each passed CI collided on `dev`: task 02 deleted `/api/v1/me` (and moved the existing e2e probes to `/cellar`), task 13 then added a test that calls it. The new test now reads `/api/v1/profile`, whose `username` is copied from the token at profile creation. |
| 2026-10-30 | CI `Gates section filled in`, PR 465 (iteration 9 task 01) | `Gates section: no verdict on a line starting "- **Range:**"` | The `git log` range was written in a fenced block under the label; `scripts/check-pr-body.mjs` reads the verdict from the label's own line. Fixed by editing the PR body to put it inline. |
| 2026-10-24 | CI `Keycloak realm check`, `dev` run 40077060971 (merge of PR 393) | `failed to solve: quay.io/keycloak/keycloak:… failed to resolve source metadata … 503 Service Unavailable` | quay.io was down while the `keycloak` image's `FROM` was resolved; the other seven jobs of the run were green. Not a diff problem. The job had no pre-pull step yet; the `Pre-pull compose images` step added afterwards, and this signature, are in [ci-playbook.md](ci-playbook.md). Logged late: nobody was working on `dev` when it went red. |
| 2026-10-25 | CI `vulnerability-scan`, image scan, `dev` run 40166251873 (merge of PR 417) | `Unable to initialize the Java DB: Java DB update failed: OCI artifact error: failed to download Java DB … mirror.gcr.io/aquasec/trivy-java-db:1 … unexpected status code 404 Not Found` | Trivy's Java DB mirror 404ed, as on PR 421 hours later; the rest of the run was green. A re-run is the remedy. Logged late, on the same ground as run 40077060971. |
| 2026-10-25 | CI `Backend (Maven)`, `dev` run 40168778643 (merge of PR 421) | `ProfileServiceConcurrencyIT.concurrentFirstReadsForANewUserBothSucceedAgainstOneSharedProfile`: `Status expected:<200 OK> but was:<409 CONFLICT>` | Two first requests for a brand-new user race to create the profile and the loser answers 409, so a flake that is a real race, not a CI fault; the other 286 tests passed. Iteration 9 task 16 (PR 467) fixes it. Logged late, on the same ground as run 40077060971. |
