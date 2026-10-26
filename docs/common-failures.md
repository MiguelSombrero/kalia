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
