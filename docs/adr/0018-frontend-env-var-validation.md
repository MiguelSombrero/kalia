# ADR-0018: Frontend environment-variable validation via `instrumentation.ts`

- **Status:** accepted
- **Date:** 2026-07-26

## Context

Iteration 3 task 8. The frontend has exactly one environment-dependent
value today: `BACKEND_URL`, read in `kaliaFetch`
(`lib/api/mutator.ts`) as `process.env.BACKEND_URL ?? "http://localhost:8080"`.
The fallback is deliberate and correct for `npm run dev`, where the backend
also runs outside Docker on `localhost:8080` — `docker-compose.yml` always
sets `BACKEND_URL` explicitly for the containerized stack, so the fallback
is never silently wrong there either.

The real gap: a production deployment that forgets to set `BACKEND_URL`
does not fail at startup. It falls back to `localhost:8080`, and every
request then fails with `apiError("network", "Could not reach the backend
for …")` — indistinguishable from a transient network blip. Nothing names
the actual cause. This is the same shape of problem
[ADR-0015](0015-configuration-strategy.md) solved on the backend for
`POSTGRES_PASSWORD` (a missing secret used to surface as `password
authentication failed`, pointing an operator at a credential mismatch
instead of absent configuration) — except the backend already has a
mechanism and the frontend does not.

**Where to run the check.** Next.js's `instrumentation.ts` exports a
`register` function, called once when a new server instance starts
(`node_modules/next/dist/docs/01-app/02-guides/instrumentation.md` — this
Next.js version differs from training data, so the guide was read rather
than assumed). No experimental flag is needed; the convention is stable at
this version. This is the closest analogue to the backend's `main()`-time
check available in this framework — but not an equivalent one, measured
against the actual built server rather than assumed from the docs:

- The docs say `register` "must complete before the server is ready to
  handle requests." Measured on `next@16.2.10`: it does not. Running the
  standalone server (`node .next/standalone/server.js`) with `register`
  throwing prints `✓ Ready in 0ms` regardless, then logs the error on
  first request. The process keeps listening and answers **every**
  request with a 500 indefinitely — a broken server that looks "up" to
  anything only checking whether the container is running.
  `docker-compose.yml`'s frontend service has no healthcheck today, so
  nothing would currently notice this state either.
- An explicit `process.exit(1)` inside `register`, by contrast, was
  measured to actually terminate the process (exit code 1, confirmed by
  running the built server synchronously and checking `$?`). This is what
  a container orchestrator can observe as a genuine startup failure —
  matching what "fail fast" means operationally, not just "log the right
  words somewhere."

So the decision is `register` catching the validation error, logging it,
and calling `process.exit(1)` — not merely letting it throw.

**Second measured finding: `register` also runs for the Edge runtime.**
Next.js bundles `instrumentation.ts` into `proxy.ts`'s edge chunk too — the
docs call this out explicitly ("Next.js calls register in all
environments") and recommend gating on `process.env.NEXT_RUNTIME`, but the
consequence is concrete here: confirmed by inspecting the built edge chunk
(`.next/server/edge/`), `BACKEND_URL` and the validation logic were present
in it before this guard existed. `process.exit` does not exist in that
sandbox, so an ungated version would either throw a confusing
runtime-internal error instead of the intended message, or behave
unpredictably, on every request through `proxy.ts` (nearly all of them —
its matcher excludes only `_next`, `api`, and extensioned files) in exactly
the misconfigured-`BACKEND_URL` scenario this feature exists to catch.
`register` therefore returns immediately unless
`process.env.NEXT_RUNTIME === "nodejs"`. Rebuilding after adding the guard
confirmed the entire check is now dead-code-eliminated from the edge
bundle (Turbopack inlines `NEXT_RUNTIME` per build target): `register`
there compiles down to `() => {}`.

**Two alternatives considered:**

- **Do nothing, document the current behavior as sufficient.** `BACKEND_URL`
  already fits ADR-0015's "connection target, safe localhost default"
  category — an unset value fails loudly per request rather than silently
  succeeding against the wrong system. Rejected: "loudly" here means an
  unlabelled network error on every page load, which is a materially worse
  failure mode than the backend's named `IllegalStateException` at boot,
  and there is a framework-native hook available to close that gap cheaply.
- **A `@ConfigurationProperties`-equivalent validated at first request**
  (e.g. inside `kaliaFetch` itself). Rejected: this reruns the check on
  every request instead of once, and a deployment could serve several
  requests (or none, if a route is statically cached) before the first
  call to `kaliaFetch` ever executes, delaying the failure past startup for
  no benefit.

## Decision

- **`instrumentation.ts`** (project root, no `src/` folder in this repo)
  exports `register`, which returns immediately unless
  `NEXT_RUNTIME === "nodejs"`, then calls
  `verifyRequiredConfiguration(process.env)` inside a `try`/`catch` and, on
  failure, logs the message and calls `process.exit(1)`.
- **`lib/config/requiredConfiguration.ts`** holds the actual check as a pure
  function that throws, taking the environment as a parameter (mirrors
  `RequiredConfigurationValidator`'s `UnaryOperator<String>` parameter) so
  it is unit-testable without mutating `process.env` or mocking
  `process.exit`. `instrumentation.ts` itself stays thin and untested —
  framework glue at the integration boundary, the same role
  `KaliaApplication.main()` plays on the backend.
- **Enforced only when `NODE_ENV === "production"`.** The Dockerfile's
  runtime stage sets this explicitly, so both `docker compose up` and any
  deployment following that image see the check. `npm run dev` sets
  `development` and is unaffected — the localhost fallback keeps working
  exactly as today. Vitest does not start a Next.js server, so `register`
  never runs during `npm test` either; no test-only configuration is
  needed, matching ADR-0015's reasoning for why the backend validator
  needs no test-profile carve-out.
- **One required variable today: `BACKEND_URL`.** Listed in a
  `REQUIRED_IN_PRODUCTION` array, the same shape as the backend's
  `REQUIRED` list — a future required frontend secret (session cookie key,
  OAuth client id, once Auth lands) is added there, not by inventing a new
  mechanism.
- **Message names the missing variable and points at `frontend/README.md`**,
  matching the backend validator's wording exactly.

## Consequences

- A production deployment missing `BACKEND_URL` now exits with code 1 and
  a named error at startup, instead of either serving pages that fail
  every backend call with an unlabelled network error, or (had this
  stopped at a bare throw) staying up and 500ing every request forever.
- `npm run dev` and `npm test` are both unaffected — neither runs in
  `NODE_ENV=production`, so `register`'s check is a no-op for either.
- Adding a required frontend variable later means adding it to
  `REQUIRED_IN_PRODUCTION`, exactly mirroring the backend's convention from
  ADR-0015.
- `frontend/README.md` documents `BACKEND_URL` alongside this mechanism, the
  same way `backend/README.md` documents its own required/defaulted
  variables.
